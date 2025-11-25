/**
 * Export Logs Module
 * 日志导出模块
 *
 * Exports parsed log data to JSON format for the viewer
 * 将解析后的日志数据导出为查看器的 JSON 格式
 */

import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './config.js';
import { parseLogs, LogItem } from './log-parser.js';

/**
 * Viewer JSON output interface
 * 查看器 JSON 输出接口
 */
interface ViewerJson {
    dataType: string;
    generatedAt: string;
    totalItems: number;
    items: LogItem[];
}

/**
 * Export logs to JSON file
 * 导出日志到 JSON 文件
 */
export function exportLogs(): boolean {
    try {
        const config = getConfig();

        console.log('[Export] Reading log file:', config.paths.logFile);

        // Parse logs | 解析日志
        const sessions = parseLogs(config.paths.logFile);
        console.log(`[Export] Parsed ${sessions.length} sessions`);

        // Create viewer JSON output | 创建查看器 JSON 输出
        const viewerJson: ViewerJson = {
            dataType: 'logs',
            generatedAt: new Date().toISOString(),
            totalItems: sessions.length,
            items: sessions
        };

        // Ensure output directory exists | 确保输出目录存在
        const outputDir = path.dirname(config.paths.outputJson);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('[Export] Created output directory:', outputDir);
        }

        // Write JSON file | 写入 JSON 文件
        fs.writeFileSync(
            config.paths.outputJson,
            JSON.stringify(viewerJson, null, 2),
            'utf-8'
        );

        console.log(`[Export] ✓ Successfully exported ${sessions.length} sessions to: ${config.paths.outputJson}`);
        return true;
    } catch (error) {
        console.error('[Export] ✗ Export failed:', error);
        if (error instanceof Error) {
            console.error('[Export]   Error details:', error.message);
        }
        return false;
    }
}

/**
 * Run export when called directly
 * 直接调用时运行导出
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    console.log('=== Export Logs Data Started ===');
    const success = exportLogs();
    console.log('=== Export Logs Data Completed ===');
    process.exit(success ? 0 : 1);
}
