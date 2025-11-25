/**
 * Configuration Module
 * 配置管理模块
 *
 * Loads and validates configuration from config.json
 * 从 config.json 加载并验证配置
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Server configuration interface
 * 服务器配置接口
 */
export interface ServerConfig {
    port: number;
    host: string;
}

/**
 * Paths configuration interface
 * 路径配置接口
 */
export interface PathsConfig {
    viewerRoot: string;
    logFile: string;
    outputJson: string;
}

/**
 * Long-polling configuration interface
 * 长轮询配置接口
 */
export interface LongPollingConfig {
    timeoutSeconds: number;
    checkIntervalMs: number;
}

/**
 * File watcher configuration interface
 * 文件监听配置接口
 */
export interface FileWatcherConfig {
    debounceSeconds: number;
    writeDelayMs: number;
    completionTimeoutSeconds: number;
    completionMarker: string;
    pollingIntervalMs: number;
    usePolling: boolean;
}

/**
 * HTTP configuration interface
 * HTTP 配置接口
 */
export interface HttpConfig {
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
}

/**
 * Main configuration interface
 * 主配置接口
 */
export interface Config {
    server: ServerConfig;
    paths: PathsConfig;
    longPolling: LongPollingConfig;
    fileWatcher: FileWatcherConfig;
    http: HttpConfig;
}

/**
 * Load configuration from config.json
 * 从 config.json 加载配置
 */
export function loadConfig(): Config {
    // Config is at module root: modules/log-viewer/config.json
    // Source is at: modules/log-viewer/backend/src/config.ts
    // So we need to go up 2 levels: ../../config.json
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Config;

    // Validate required fields | 验证必需字段
    if (!config.server || !config.paths || !config.longPolling || !config.fileWatcher || !config.http) {
        throw new Error('Invalid configuration: missing required sections');
    }

    return config;
}

/**
 * Resolve relative paths to absolute paths
 * 将相对路径解析为绝对路径
 */
export function resolvePaths(config: Config): Config {
    // Base directory is the module root: modules/log-viewer/
    const baseDir = path.join(__dirname, '..', '..');

    return {
        ...config,
        paths: {
            viewerRoot: path.resolve(baseDir, config.paths.viewerRoot),
            logFile: path.resolve(baseDir, config.paths.logFile),
            outputJson: path.resolve(baseDir, config.paths.outputJson)
        }
    };
}

/**
 * Get configuration with resolved paths
 * 获取解析后路径的配置
 */
export function getConfig(): Config {
    const config = loadConfig();
    return resolvePaths(config);
}
