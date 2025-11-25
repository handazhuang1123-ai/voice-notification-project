/**
 * HTTP Server Module
 * HTTP 服务器模块
 *
 * Express server with static file serving and long-polling support
 * 支持静态文件服务和长轮询的 Express 服务器
 */

import express, { Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import { getConfig } from './config.js';
import { exportLogs } from './export-logs.js';
import { FileWatcher } from './file-watcher.js';
import { parseLogsWithPagination } from './log-parser.js';

/**
 * Long-polling client interface
 * 长轮询客户端接口
 */
interface LongPollClient {
    res: Response;
    timer: NodeJS.Timeout;
}

/**
 * Main server class
 * 主服务器类
 */
class LogViewerServer {
    private app: express.Application;
    private config = getConfig();
    private fileWatcher: FileWatcher;
    private longPollClients: LongPollClient[] = [];
    private updatePending = false;
    private requestCount = 0;

    constructor() {
        this.app = express();
        this.fileWatcher = new FileWatcher();
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     * 设置 Express 中间件
     */
    private setupMiddleware(): void {
        // Request logging | 请求日志
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            this.requestCount++;
            console.log(`[${this.requestCount}] ${req.method} ${req.path}`);
            next();
        });

        // CORS headers for development | 开发环境 CORS 头
        this.app.use((_req: Request, res: Response, next: NextFunction) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });

        // Static file serving with cache control | 静态文件服务带缓存控制
        this.app.use(express.static(this.config.paths.viewerRoot, {
            setHeaders: (res: Response, filePath: string) => {
                // Disable caching for JSON files to ensure fresh data
                // 禁用 JSON 文件缓存以确保获取最新数据
                if (filePath.endsWith('.json')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                }
            }
        }));
    }

    /**
     * Setup Express routes
     * 设置 Express 路由
     */
    private setupRoutes(): void {
        // Pagination API endpoint | 分页 API 端点
        this.app.get('/api/logs', (req: Request, res: Response) => {
            try {
                // Parse query parameters | 解析查询参数
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 50;

                console.log(`[API] /api/logs - page=${page}, limit=${limit}`);

                // Get paginated logs | 获取分页日志
                const result = parseLogsWithPagination(this.config.paths.logFile, {
                    page,
                    limit
                });

                // Return JSON response | 返回 JSON 响应
                res.json({
                    dataType: 'logs',
                    generatedAt: new Date().toISOString(),
                    ...result
                });

                console.log(`[API] ✓ Returned ${result.items.length} items for page ${page}`);
            } catch (error) {
                console.error('[API] Error handling /api/logs:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Long-polling endpoint | 长轮询端点
        this.app.get('/sse/updates', (req: Request, res: Response) => {
            this.handleLongPoll(req, res);
        });

        // Health check endpoint | 健康检查端点
        this.app.get('/health', (_req: Request, res: Response) => {
            res.json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler | 404 处理
        this.app.use((_req: Request, res: Response) => {
            res.status(404).send('404 - Not Found');
        });

        // Error handler | 错误处理
        this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
            console.error('[Server] Error:', err);
            res.status(500).send('500 - Internal Server Error');
        });
    }

    /**
     * Handle long-polling request
     * 处理长轮询请求
     */
    private handleLongPoll(_req: Request, res: Response): void {
        console.log('[LongPoll] Client connected, waiting for updates...');

        // Check if update is already pending | 检查是否已有待发送的更新
        if (this.updatePending) {
            this.updatePending = false;
            res.json({
                hasUpdate: true,
                timestamp: new Date().toISOString()
            });
            console.log('[LongPoll] ✓ Immediate response: hasUpdate=true');
            return;
        }

        // Set response headers | 设置响应头
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');

        // Create timeout timer | 创建超时定时器
        const timer = setTimeout(() => {
            // Timeout - no update received | 超时 - 没有收到更新
            this.removeLongPollClient(res);

            if (!res.headersSent) {
                res.json({
                    hasUpdate: false,
                    timestamp: new Date().toISOString()
                });
                console.log('[LongPoll] ⏱️  Timeout: hasUpdate=false');
            }
        }, this.config.longPolling.timeoutSeconds * 1000);

        // Add client to waiting list | 添加客户端到等待列表
        this.longPollClients.push({ res, timer });

        // Handle client disconnect | 处理客户端断开连接
        res.on('close', () => {
            this.removeLongPollClient(res);
            console.log('[LongPoll] Client disconnected');
        });
    }

    /**
     * Remove long-poll client from waiting list
     * 从等待列表中移除长轮询客户端
     */
    private removeLongPollClient(res: Response): void {
        const index = this.longPollClients.findIndex(client => client.res === res);
        if (index !== -1) {
            clearTimeout(this.longPollClients[index].timer);
            this.longPollClients.splice(index, 1);
        }
    }

    /**
     * Notify all waiting long-poll clients of an update
     * 通知所有等待的长轮询客户端有更新
     */
    private notifyClients(): void {
        console.log(`[LongPoll] Notifying ${this.longPollClients.length} waiting clients...`);

        // Send update to all waiting clients | 发送更新到所有等待的客户端
        for (const client of this.longPollClients) {
            clearTimeout(client.timer);
            if (!client.res.headersSent) {
                client.res.json({
                    hasUpdate: true,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Clear client list | 清空客户端列表
        this.longPollClients = [];

        // Set pending flag for new clients | 为新客户端设置待发送标志
        this.updatePending = true;
    }

    /**
     * Start the server
     * 启动服务器
     */
    public async start(): Promise<void> {
        try {
            // Export initial data | 导出初始数据
            console.log('\n[1/4] Exporting initial log data...');
            exportLogs();

            // Start file watcher | 启动文件监听器
            console.log('\n[2/4] Starting file watcher...');
            this.fileWatcher.start(() => {
                this.notifyClients();
            });

            // Start HTTP server | 启动 HTTP 服务器
            console.log('\n[3/4] Starting HTTP server...');
            await new Promise<void>((resolve, reject) => {
                const server = this.app.listen(this.config.server.port, this.config.server.host, () => {
                    console.log(`✓ HTTP server started at http://${this.config.server.host}:${this.config.server.port}`);
                    resolve();
                });

                server.on('error', (error: NodeJS.ErrnoException) => {
                    if (error.code === 'EADDRINUSE') {
                        console.error(`\n✗ Port ${this.config.server.port} is already in use`);
                        console.error('Please try a different port in config.json');
                    } else {
                        console.error('\n✗ Server error:', error);
                    }
                    reject(error);
                });
            });

            // Open browser | 打开浏览器
            console.log('\n[4/4] Opening viewer in browser...');
            // Open React frontend (port 3004) instead of old HTML version
            // 打开 React 前端（端口 3004）而不是旧的 HTML 版本
            const frontendUrl = 'http://localhost:3004';
            this.openBrowser(frontendUrl);

            console.log('\n=== Pip-Boy Log Viewer Ready ===');
            console.log(`  Backend API: http://${this.config.server.host}:${this.config.server.port}`);
            console.log(`  Frontend UI: ${frontendUrl}`);
            console.log('\nPress Ctrl+C to stop the server and exit...');
        } catch (error) {
            console.error('\n✗ Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Open URL in default browser
     * 在默认浏览器中打开 URL
     */
    private openBrowser(url: string): void {
        const platform = process.platform;

        let command: string;
        if (platform === 'win32') {
            command = `start ${url}`;
        } else if (platform === 'darwin') {
            command = `open ${url}`;
        } else {
            command = `xdg-open ${url}`;
        }

        exec(command, (error) => {
            if (error) {
                console.warn('Failed to open browser automatically. Please open manually:', url);
            } else {
                console.log('✓ Browser opened');
            }
        });
    }

    /**
     * Stop the server
     * 停止服务器
     */
    public async stop(): Promise<void> {
        console.log('\n=== Stopping Server... ===');

        // Stop file watcher | 停止文件监听器
        await this.fileWatcher.stop();

        // Close all long-poll connections | 关闭所有长轮询连接
        for (const client of this.longPollClients) {
            clearTimeout(client.timer);
            if (!client.res.headersSent) {
                client.res.end();
            }
        }
        this.longPollClients = [];

        console.log('✓ Server stopped');
    }
}

/**
 * Main entry point
 * 主入口点
 */
async function main(): Promise<void> {
    console.log('=== Opening Pip-Boy Log Viewer (Node.js/TypeScript) ===');

    const server = new LogViewerServer();

    // Handle graceful shutdown | 处理优雅关闭
    const shutdown = (): void => {
        void (async (): Promise<void> => {
            await server.stop();
            process.exit(0);
        })();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start server | 启动服务器
    await server.start();
}

// Run main function | 运行主函数
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
