const axios = require('axios');

/**
 * 嵌入向量生成服务
 * 使用 Qwen3-Embedding:0.6b 模型通过 Ollama API 生成 768 维向量
 *
 * @author 壮爸
 * @created 2025-01-20
 */
class EmbeddingService {
    constructor(ollamaUrl = 'http://localhost:11434') {
        this.ollamaUrl = ollamaUrl;
        this.model = 'qwen3-embedding:0.6b';
    }

    /**
     * 生成单个文本的嵌入向量
     * @param {string} text - 输入文本
     * @returns {Promise<number[]>} 768维向量
     */
    async generate(text) {
        try {
            const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
                model: this.model,
                prompt: text
            });

            return response.data.embedding;
        } catch (error) {
            console.error('❌ 嵌入生成失败:', error.message);
            throw error;
        }
    }

    /**
     * 批量生成嵌入向量
     * @param {string[]} texts - 文本数组
     * @param {number} batchSize - 批次大小
     * @returns {Promise<number[][]>} 向量数组
     */
    async generateBatch(texts, batchSize = 10) {
        const results = [];

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
     * @param {number[]} embedding - 向量
     * @returns {Buffer} SQLite BLOB
     */
    toBlob(embedding) {
        return Buffer.from(new Float32Array(embedding).buffer);
    }

    /**
     * 从BLOB恢复向量
     * @param {Buffer} blob - SQLite BLOB
     * @returns {number[]} 向量
     */
    fromBlob(blob) {
        return Array.from(new Float32Array(blob.buffer, blob.byteOffset, blob.length / 4));
    }
}

module.exports = EmbeddingService;
