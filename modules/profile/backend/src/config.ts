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
    database: string;
}

/**
 * Model configuration interface
 * 模型配置接口
 */
export interface ModelsConfig {
    default: string;
    fallback: string;
}

/**
 * Ollama configuration interface
 * Ollama 配置接口
 */
export interface OllamaConfig {
    url: string;
    options: {
        temperature: number;
        top_p: number;
        num_ctx: number;
        num_predict: number;
    };
}

/**
 * Main configuration interface
 * 主配置接口
 */
export interface Config {
    name: string;
    version: string;
    description: string;
    author: string;
    server: ServerConfig;
    paths: PathsConfig;
    models: ModelsConfig;
    ollama: OllamaConfig;
}

/**
 * Load configuration from config.json
 * 从 config.json 加载配置
 */
export function loadConfig(): Config {
    // Config is at module root: modules/profile/config.json
    // Source is at: modules/profile/backend/src/config.ts
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Config;

    // Validate required fields | 验证必需字段
    if (!config.server || !config.paths || !config.models || !config.ollama) {
        throw new Error('Invalid configuration: missing required sections');
    }

    return config;
}

/**
 * Resolve relative paths to absolute paths
 * 将相对路径解析为绝对路径
 */
export function resolvePaths(config: Config): Config {
    // Base directory is the module root: modules/profile/
    const baseDir = path.join(__dirname, '..', '..');

    return {
        ...config,
        paths: {
            viewerRoot: path.resolve(baseDir, config.paths.viewerRoot),
            database: path.resolve(baseDir, config.paths.database)
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
