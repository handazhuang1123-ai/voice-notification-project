/**
 * File Watcher Module
 * 文件监听模块
 *
 * Monitors log file changes and triggers data export
 * 监听日志文件变化并触发数据导出
 */

import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { getConfig } from './config';
import { exportLogs } from './export-logs';

/**
 * Update notification callback type
 * 更新通知回调类型
 */
export type UpdateCallback = () => void;

/**
 * File Watcher class
 * 文件监听器类
 */
export class FileWatcher {
    private watcher: chokidar.FSWatcher | null = null;
    private lastExportTime: number = 0;
    private updateCallback: UpdateCallback | null = null;
    private completionCheckTimer: NodeJS.Timeout | null = null;

    /**
     * Start watching the log file
     * 开始监听日志文件
     */
    public start(onUpdate: UpdateCallback): void {
        const config = getConfig();
        this.updateCallback = onUpdate;

        if (!fs.existsSync(config.paths.logFile)) {
            console.warn(`[FileWatcher] Log file not found: ${config.paths.logFile}`);
            console.warn('[FileWatcher] FileWatcher not started. Auto-update will not work.');
            return;
        }

        // Create chokidar watcher | 创建 chokidar 监听器
        // Use polling on Windows for more reliable detection
        // Windows 上使用轮询以获得更可靠的检测
        this.watcher = chokidar.watch(config.paths.logFile, {
            persistent: true,
            ignoreInitial: true,
            usePolling: config.fileWatcher.usePolling,
            interval: config.fileWatcher.pollingIntervalMs,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 200
            }
        });

        console.log(`[FileWatcher] Polling mode: ${config.fileWatcher.usePolling ? 'enabled' : 'disabled'}, interval: ${config.fileWatcher.pollingIntervalMs}ms`);

        // Register change event | 注册变化事件
        this.watcher.on('change', (path: string) => {
            console.log('[FileWatcher] ✓ File change event detected!');
            this.handleFileChange(path);
        });

        // Add error handler | 添加错误处理
        this.watcher.on('error', (error) => {
            console.error('[FileWatcher] ✗ Watcher error:', error);
        });

        console.log(`[FileWatcher] ✓ Started monitoring: ${config.paths.logFile}`);
    }

    /**
     * Stop watching the log file
     * 停止监听日志文件
     */
    public async stop(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
            console.log('[FileWatcher] ✓ Stopped');
        }

        if (this.completionCheckTimer) {
            clearTimeout(this.completionCheckTimer);
            this.completionCheckTimer = null;
        }
    }

    /**
     * Handle file change event
     * 处理文件变化事件
     */
    private handleFileChange(filePath: string): void {
        const config = getConfig();
        const now = Date.now();

        // Debounce: Only trigger if configured seconds have passed since last export
        // 防抖：仅在上次导出后配置的秒数才触发
        if (this.lastExportTime && (now - this.lastExportTime) < config.fileWatcher.debounceSeconds * 1000) {
            console.log('[FileWatcher] Change detected but debounced, skipping...');
            return;
        }

        console.log(`[FileWatcher] File changed: ${filePath}`);

        // Wait for log completion marker
        // 等待日志完成标记
        // Node.js is async, so waiting 60s won't block other requests!
        // Node.js 是异步的，等待 60 秒不会阻塞其他请求！
        this.waitForLogCompletion(filePath);
    }

    /**
     * Wait for voice notification log to complete by detecting completion marker
     * 等待语音通知日志完成（通过检测完成标记）
     */
    private waitForLogCompletion(filePath: string): void {
        const config = getConfig();
        console.log('[FileWatcher] Waiting for log completion marker...');

        const startTime = Date.now();
        const checkInterval = 1000; // Check every 1 second
        let previousLineCount = 0;

        // Get initial line count | 获取初始行数
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            previousLineCount = content.split('\n').length;
            console.log(`[FileWatcher]   Initial line count: ${previousLineCount}`);
        } catch (error) {
            console.warn('[FileWatcher] Failed to read initial file content:', error);
            return;
        }

        // Set up polling check | 设置轮询检查
        const checkCompletion = (): void => {
            const elapsed = (Date.now() - startTime) / 1000;

            // Check max wait timeout | 检查最大等待超时
            if (elapsed > config.fileWatcher.completionTimeoutSeconds) {
                console.log(`[FileWatcher] ⏭️  Log not yet complete (within ${config.fileWatcher.completionTimeoutSeconds}s timeout), skipping this export`);
                console.log('[FileWatcher] 📝 Will retry on next file change event');
                return;
            }

            // Read file and check for completion marker | 读取文件并检查完成标记
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                const currentLineCount = lines.length;

                // Check if new lines were added | 检查是否添加了新行
                if (currentLineCount > previousLineCount) {
                    // Check last 10 lines for completion marker | 检查最后 10 行是否有完成标记
                    const recentLines = lines.slice(-10);
                    const hasCompletionMarker = recentLines.some(line =>
                        line.includes(config.fileWatcher.completionMarker)
                    );

                    if (hasCompletionMarker) {
                        console.log(`[FileWatcher]   ✓ Completion marker detected at line ${currentLineCount}`);
                        // Wait additional time for file handle to close
                        // 额外等待文件句柄关闭
                        setTimeout(() => {
                            this.exportAndNotify();
                        }, 2000);
                        return;
                    }

                    // Update line count | 更新行数
                    console.log(`[FileWatcher]   Lines: ${previousLineCount} -> ${currentLineCount} (waiting for completion...)`);
                    previousLineCount = currentLineCount;
                }

                // Schedule next check | 安排下次检查
                this.completionCheckTimer = setTimeout(checkCompletion, checkInterval);
            } catch (error) {
                console.warn('[FileWatcher] Failed to read file content:', error);
                // Continue waiting, file might be temporarily locked
                this.completionCheckTimer = setTimeout(checkCompletion, checkInterval);
            }
        };

        // Start checking | 开始检查
        checkCompletion();
    }


    /**
     * Export data and notify clients
     * 导出数据并通知客户端
     */
    private exportAndNotify(): void {
        const config = getConfig();
        console.log('[FileWatcher] Ready to export data...');

        try {
            // Run export | 运行导出
            const success = exportLogs();

            if (success) {
                // Wait for file write to complete | 等待文件写入完成
                setTimeout(() => {
                    this.lastExportTime = Date.now();

                    // Notify clients | 通知客户端
                    if (this.updateCallback) {
                        this.updateCallback();
                        console.log('[FileWatcher] ✓ Data exported, long-polling clients notified');
                    }
                }, config.fileWatcher.writeDelayMs);
            }
        } catch (error) {
            console.warn('[FileWatcher] Auto-export failed:', error);
        }
    }
}
