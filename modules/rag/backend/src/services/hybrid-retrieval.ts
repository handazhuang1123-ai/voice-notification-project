/**
 * 混合检索引擎（向量 + BM25 + RRF融合）
 * 适配独立的 knowledge_keywords 表结构
 *
 * @author 壮爸
 * @created 2025-01-20
 * @version 2.0.0 (TypeScript)
 */

import Database from 'better-sqlite3';
// @ts-expect-error - wink-bm25-text-search doesn't have TypeScript definitions
import winkBM25 from 'wink-bm25-text-search';
import { EmbeddingService } from './embedding-service.js';
import { getConfig } from '../config.js';

/**
 * Knowledge item interface
 */
interface KnowledgeItem {
    id: number;
    content: string;
    embedding: Buffer;
    layer: number;
    layer_weight: number;
    user_rating: number | null;
    source_type: string;
    source_id: string;
    keywords?: string;
}

/**
 * Search result interface
 */
interface SearchResult extends KnowledgeItem {
    distance?: number;
    similarity?: number;
    bm25_score?: number;
    rrf_score?: number;
    final_score?: number;
}

export class HybridRetriever {
    private db: Database.Database;
    private embeddingService: EmbeddingService;
    private bm25: ReturnType<typeof winkBM25> | null;
    private config = getConfig();

    constructor(dbPath?: string) {
        this.db = new Database(dbPath || this.config.paths.database);
        this.embeddingService = new EmbeddingService();
        this.bm25 = winkBM25();
        this.initBM25Index();
    }

    /**
     * 初始化BM25索引
     */
    private initBM25Index(): void {
        console.log('🔍 初始化BM25索引...');

        if (!this.bm25) return;

        // 配置BM25
        this.bm25.defineConfig({ fldWeights: { content: 1, keywords: 2 } });
        this.bm25.definePrepTasks([
            (text: string) => text.toLowerCase().split(/[\s\.,;!?，。；！？]+/).filter((t: string) => t.length > 0)
        ]);

        // 从数据库加载知识条目和关键词
        const knowledge = this.db.prepare(`
            SELECT
                kb.id,
                kb.content,
                GROUP_CONCAT(kw.keyword, ' ') as keywords
            FROM knowledge_base kb
            LEFT JOIN knowledge_keywords kw ON kb.id = kw.knowledge_id
            GROUP BY kb.id
        `).all() as { id: number; content: string; keywords: string | null }[];

        knowledge.forEach(item => {
            this.bm25!.addDoc({
                content: item.content,
                keywords: item.keywords || '',
                id: item.id
            }, item.id);
        });

        // BM25 至少需要 3 条文档才能 consolidate
        if (knowledge.length >= 3) {
            this.bm25.consolidate();
            console.log(`✅ BM25索引已加载 ${knowledge.length} 条记录`);
        } else {
            console.warn(`⚠️  BM25索引文档数量不足（${knowledge.length}条），至少需要3条。关键词检索将不可用。`);
            this.bm25 = null;
        }
    }

    /**
     * 混合检索主函数
     * @param query - 用户查询
     * @param topK - 返回数量
     * @param alpha - 向量权重 (0-1)
     * @returns 排序后的结果
     */
    async retrieve(query: string, topK = 10, alpha = 0.7): Promise<SearchResult[]> {
        console.log(`🔍 检索: "${query}" (Top-${topK}, alpha=${alpha})`);

        // 1. 生成查询向量
        const queryEmbedding = await this.embeddingService.generate(query);

        // 2. 向量检索
        const vectorResults = this.vectorSearch(queryEmbedding, topK * 2);

        // 3. BM25关键词检索
        const keywordResults = this.bm25Search(query, topK * 2);

        // 4. RRF融合
        const fusedResults = this.reciprocalRankFusion(vectorResults, keywordResults, alpha);

        // 5. 应用分层权重
        const weightedResults = this.applyLayerWeights(fusedResults);

        // 6. 返回Top-K
        return weightedResults.slice(0, topK);
    }

    /**
     * 向量相似度搜索（余弦相似度）
     */
    private vectorSearch(queryEmbedding: number[], limit: number): SearchResult[] {
        const allKnowledge = this.db.prepare(`
            SELECT
                kb.id,
                kb.content,
                kb.embedding,
                kb.layer,
                kb.layer_weight,
                kb.user_rating,
                kb.source_type,
                kb.source_id,
                GROUP_CONCAT(kw.keyword, ', ') as keywords
            FROM knowledge_base kb
            LEFT JOIN knowledge_keywords kw ON kb.id = kw.knowledge_id
            GROUP BY kb.id
        `).all() as KnowledgeItem[];

        const results: SearchResult[] = allKnowledge.map(item => {
            const itemEmbedding = this.embeddingService.fromBlob(item.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, itemEmbedding);

            return {
                ...item,
                distance: 1 - similarity,
                similarity: similarity
            };
        });

        results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

        return results.slice(0, limit);
    }

    /**
     * BM25关键词搜索
     */
    private bm25Search(query: string, limit: number): SearchResult[] {
        if (!this.bm25) {
            return [];
        }

        const results = this.bm25.search(query, limit) as { id: number; score: number }[];

        return results.map(result => {
            const item = this.db.prepare(`
                SELECT
                    kb.*,
                    GROUP_CONCAT(kw.keyword, ', ') as keywords
                FROM knowledge_base kb
                LEFT JOIN knowledge_keywords kw ON kb.id = kw.knowledge_id
                WHERE kb.id = ?
                GROUP BY kb.id
            `).get(result.id) as KnowledgeItem;

            return {
                ...item,
                bm25_score: result.score
            };
        });
    }

    /**
     * RRF (Reciprocal Rank Fusion) 融合
     */
    private reciprocalRankFusion(
        vectorResults: SearchResult[],
        keywordResults: SearchResult[],
        alpha: number,
        k = 60
    ): SearchResult[] {
        const scores = new Map<number, number>();

        // 向量检索得分
        vectorResults.forEach((item, rank) => {
            const rrfScore = alpha / (k + rank + 1);
            scores.set(item.id, (scores.get(item.id) || 0) + rrfScore);
        });

        // 关键词检索得分
        keywordResults.forEach((item, rank) => {
            const rrfScore = (1 - alpha) / (k + rank + 1);
            scores.set(item.id, (scores.get(item.id) || 0) + rrfScore);
        });

        // 合并所有结果
        const allIds = [...new Set([
            ...vectorResults.map(r => r.id),
            ...keywordResults.map(r => r.id)
        ])];

        return allIds.map(id => {
            const item = vectorResults.find(r => r.id === id) || keywordResults.find(r => r.id === id)!;
            return {
                ...item,
                rrf_score: scores.get(id)
            };
        }).sort((a, b) => (b.rrf_score || 0) - (a.rrf_score || 0));
    }

    /**
     * 应用6层知识分层权重
     */
    private applyLayerWeights(results: SearchResult[]): SearchResult[] {
        return results.map(item => {
            let finalScore = (item.rrf_score || 0) * item.layer_weight;

            // 用户评分调整
            if (item.user_rating) {
                const ratingBoost = (item.user_rating - 3) * 0.1;
                finalScore *= (1 + ratingBoost);
            }

            return {
                ...item,
                final_score: finalScore
            };
        }).sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    }

    /**
     * 余弦相似度计算
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * 关闭数据库连接
     */
    close(): void {
        this.db.close();
    }
}
