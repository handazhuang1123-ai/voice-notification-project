/**
 * Configuration Module
 * 配置管理模块
 *
 * Author: 壮爸
 * Version: 2.0.0 (TypeScript)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ollama configuration interface
 */
export interface OllamaConfig {
    url: string;
}

/**
 * Embedding configuration interface
 */
export interface EmbeddingConfig {
    model: string;
    dimensions: number;
    version: string;
}

/**
 * Retrieval configuration interface
 */
export interface RetrievalConfig {
    defaultTopK: number;
    defaultAlpha: number;
    rrfK: number;
}

/**
 * Layer configuration interface
 */
export interface LayerConfig {
    name: string;
    weight: number;
}

/**
 * Main configuration interface
 */
export interface Config {
    name: string;
    version: string;
    description: string;
    author: string;
    paths: {
        database: string;
    };
    ollama: OllamaConfig;
    embedding: EmbeddingConfig;
    retrieval: RetrievalConfig;
    layers: Record<string, LayerConfig>;
}

/**
 * Load configuration from config.json
 */
export function loadConfig(): Config {
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent) as Config;
}

/**
 * Resolve relative paths to absolute paths
 */
export function resolvePaths(config: Config): Config {
    const baseDir = path.join(__dirname, '..', '..');

    return {
        ...config,
        paths: {
            database: path.resolve(baseDir, config.paths.database)
        }
    };
}

/**
 * Get configuration with resolved paths
 */
export function getConfig(): Config {
    const config = loadConfig();
    return resolvePaths(config);
}
