/**
 * 嵌入向量生成服务
 * 使用 Qwen3-Embedding:0.6b 模型通过 Ollama API 生成 768 维向量
 *
 * @author 壮爸
 * @created 2025-01-20
 * @version 2.0.0 (TypeScript)
 */

import axios from 'axios';
import { getConfig } from '../config.js';

export class EmbeddingService {
    private ollamaUrl: string;
    private model: string;

    constructor(ollamaUrl?: string, model?: string) {
        const config = getConfig();
        this.ollamaUrl = ollamaUrl || config.ollama.url;
        this.model = model || config.embedding.model;
    }

    /**
     * 生成单个文本的嵌入向量
     * @param text - 输入文本
     * @returns 768维向量
     */
    async generate(text: string): Promise<number[]> {
        try {
            const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
                model: this.model,
                prompt: text
            });

            return response.data.embedding;
        } catch (error) {
            console.error('❌ 嵌入生成失败:', (error as Error).message);
            throw error;
        }
    }

    /**
     * 批量生成嵌入向量
     * @param texts - 文本数组
     * @param batchSize - 批次大小
     * @returns 向量数组
     */
    async generateBatch(texts: string[], batchSize = 10): Promise<number[][]> {
        const results: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            const embeddings = await Promise.all(
                batch.map(text => this.generate(text))
            );

            results.push(...embeddings);

            // 避免过载，批次间等待100ms
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * 转换向量为BLOB格式（用于SQLite存储）
     * @param embedding - 向量
     * @returns SQLite BLOB
     */
    toBlob(embedding: number[]): Buffer {
        return Buffer.from(new Float32Array(embedding).buffer);
    }

    /**
     * 从BLOB恢复向量
     * @param blob - SQLite BLOB
     * @returns 向量
     */
    fromBlob(blob: Buffer): number[] {
        return Array.from(new Float32Array(blob.buffer, blob.byteOffset, blob.length / 4));
    }
}
