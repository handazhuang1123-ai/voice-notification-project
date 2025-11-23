# RAG系统实施方案与进度追踪

> **项目**: 个性化RAG系统集成到日志查看器
>
> **目标**: 通过精准的6层知识分类，训练深度了解壮爸个性的AI助手
>
> **核心原则**: 精准 > 冗杂 | 质量优先 | 本地隐私 | 可扩展
>
> **创建日期**: 2025-01-20 | **维护者**: 壮爸

---

## 📊 当前状态

### 总体进度

- [x] **需求调研** - 已完成（3份研究报告）
- [x] **技术方案设计** - 已完成（技术栈方案文档）
- [x] **环境清理** - 已完成（清除PowerShell VectorMemory相关文件）
- [ ] **Phase 1: 基础设施搭建** - 🔄 准备开始
- [ ] **Phase 2: 历史画像问卷** - ⏳ 未开始
- [ ] **Phase 3: 评分反馈机制** - ⏳ 未开始
- [ ] **Phase 4: 项目总结模块** - ⏳ 未开始
- [ ] **Phase 5: RAG搜索界面** - ⏳ 未开始
- [ ] **Phase 6: 优化与监控** - ⏳ 未开始

### 当前阶段: Phase 1 (基础设施搭建)

**状态**: 🔄 准备开始

**已完成**:
- ✅ 确定嵌入模型：Qwen3-Embedding-0.6B (替代nomic-embed-text)
- ✅ 设计数据库Schema
- ✅ 设计混合检索架构
- ✅ 确定双数据库方案（memory.db保留，新建rag-database.db）
- ✅ 清理PowerShell VectorMemory相关文件（9个文件）

**待办**:
- [ ] 创建目录结构（services/, scripts/, tests/）
- [ ] 安装Node.js依赖
- [ ] 部署Qwen3嵌入模型
- [ ] 创建数据库并初始化表结构
- [ ] 实现嵌入服务 (embedding-service.js)
- [ ] 实现混合检索引擎 (hybrid-retrieval.js)
- [ ] 编写测试脚本验证核心功能

---

## 🗂️ 数据库架构决策

### 双数据库方案（已确定）

**决策日期**: 2025-01-20

#### 方案概述

项目采用**双数据库独立运行**方案：

```
voice-notification-project/
├── data/
│   ├── memory.db          ← 【保留】语音通知系统（PowerShell）
│   └── rag-database.db    ← 【新建】日志查看器RAG系统（Node.js）
```

#### 决策理由

| 维度 | memory.db | rag-database.db | 兼容性 |
|------|-----------|-----------------|--------|
| **表结构** | interactions, embeddings, preferences, emotion_stats | knowledge_base, user_profile, project_evolution, feedback | ❌ 完全不同 |
| **数据层级** | 无层级 | L1-L6 六层知识分类 | ❌ 不兼容 |
| **嵌入模型** | nomic-embed-text (不支持中文!) | Qwen3-embedding:0.6b (中文优化) | ❌ 向量维度不同 |
| **应用场景** | 语音通知情感记忆 | 日志查看器个性化知识库 | ❌ 不同用途 |
| **运行环境** | PowerShell | Node.js + Vanilla JS | ❌ 不同技术栈 |

#### 已执行的清理工作

**删除的文件** (2025-01-20):
- ✅ `modules/VectorMemory.psm1` - PowerShell向量记忆模块
- ✅ `scripts/Initialize-MemoryDatabase.ps1` - 数据库初始化脚本
- ✅ `scripts/Fix-VectorMemoryDatabase.ps1` - 数据库修复脚本
- ✅ `examples/Example-VectorMemory-Integration.ps1` - 集成示例
- ✅ `tests/Test-VectorMemory.ps1` - 向量记忆测试
- ✅ `tests/Test-MemoryUsage.ps1` - 内存使用测试
- ✅ `docs/VectorMemory-README.md` - 说明文档
- ✅ `docs/VectorMemory使用指南.md` - 使用指南
- ✅ `docs/VectorMemory扩展方案-知识库.md` - 扩展方案

**保留的内容**:
- ⛔ `data/memory.db` 及其备份文件 - 语音通知系统可能使用
- ⛔ `lib/` 目录（System.Data.SQLite.dll, vec0.dll等）- 供参考

#### 双数据库共存配置

**Ollama模型并存**:
```bash
# 语音通知系统使用
ollama pull nomic-embed-text

# RAG系统使用
ollama pull qwen3-embedding:0.6b
```

**依赖库分离**:
- PowerShell: 使用 `lib/System.Data.SQLite.dll`
- Node.js: 使用 `npm install better-sqlite3`（自带SQLite编译）

---

## 🚀 Phase 1: 基础设施搭建 (预计1-2天)

### 目标
建立RAG核心引擎，创建**独立的rag-database.db**数据库，验证向量存储、嵌入生成、混合检索功能正常工作。

### 1.1 环境准备

#### 1.1.1 安装Node.js依赖

```bash
cd H:\HZH\Little-Projects\voice-notification-project

# 安装核心依赖
npm install better-sqlite3 wink-bm25-text-search axios express

# 安装开发依赖
npm install --save-dev nodemon
```

**验证**:
```bash
node -e "console.log(require('better-sqlite3'))"
# 应输出: [Function: SqliteDatabase]
```

#### 1.1.2 部署Qwen3嵌入模型

```bash
# 拉取模型（639MB）
ollama pull qwen3-embedding:0.6b

# 验证模型
ollama list | grep qwen3-embedding

# 测试嵌入生成
curl http://localhost:11434/api/embeddings -d '{
  "model": "qwen3-embedding:0.6b",
  "prompt": "测试中文嵌入质量"
}'
```

**预期输出**:
```json
{
  "embedding": [0.123, -0.456, ...],  // 768维向量
  "model": "qwen3-embedding:0.6b"
}
```

**⚠️ 故障排查**:
- 如果Ollama未启动：`ollama serve`
- 如果模型下载失败：检查网络连接，或使用镜像源

---

### 1.2 数据库初始化

#### 1.2.1 创建初始化脚本

**创建文件**: `scripts/init-database.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库目录
const dbPath = path.join(__dirname, '../data/rag-database.db');
const db = new Database(dbPath);

console.log('🔧 正在初始化RAG数据库...');

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建主知识库表
db.exec(`
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 内容字段
    content TEXT NOT NULL,
    embedding BLOB NOT NULL,

    -- 分层标签 (L1-L6)
    layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 6),
    layer_weight REAL NOT NULL,

    -- 元数据
    source_type TEXT NOT NULL,
    source_id TEXT,
    keywords TEXT,

    -- 质量评分
    user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
    retrieval_score REAL DEFAULT 0.0,

    -- 时间戳
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// 创建用户画像表
db.exec(`
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding BLOB,
    importance_score REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// 创建项目进化表
db.exec(`
CREATE TABLE IF NOT EXISTS project_evolution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    phase TEXT NOT NULL,
    key_features TEXT NOT NULL,
    challenges TEXT,
    solutions TEXT,
    tech_stack TEXT,
    embedding BLOB,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// 创建反馈记录表
db.exec(`
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    retrieved_ids TEXT NOT NULL,
    ratings TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// 创建检索统计表
db.exec(`
CREATE TABLE IF NOT EXISTS retrieval_stats (
    knowledge_id INTEGER PRIMARY KEY,
    total_retrievals INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0.0,
    last_retrieved TEXT,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id)
);
`);

// 创建索引
console.log('📇 创建索引...');

db.exec(`
CREATE INDEX IF NOT EXISTS idx_layer_rating ON knowledge_base(layer, user_rating DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source ON knowledge_base(source_type, source_id);
`);

// 创建全文搜索索引
db.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge_base USING fts5(
    content, keywords,
    content='knowledge_base',
    content_rowid='id'
);
`);

// 插入测试数据
console.log('🧪 插入测试数据...');

const stmt = db.prepare(`
    INSERT INTO knowledge_base (content, embedding, layer, layer_weight, source_type, source_id, keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// 创建简单的测试向量（768维全为0.1）
const testEmbedding = Buffer.from(new Float32Array(768).fill(0.1).buffer);

stmt.run(
    'PowerShell编码规范：使用批准动词、PascalCase变量命名、UTF-8 BOM编码',
    testEmbedding,
    1, // L1 核心价值
    5.0,
    'test',
    'test-001',
    JSON.stringify(['PowerShell', '编码规范'])
);

stmt.run(
    '日志查看器项目使用Vanilla JS + Node.js技术栈，采用Pip-Boy主题',
    testEmbedding,
    5, // L5 项目上下文
    2.5,
    'test',
    'test-002',
    JSON.stringify(['日志查看器', 'JavaScript'])
);

console.log('✅ 数据库初始化完成！');
console.log(`📍 数据库位置: ${dbPath}`);

// 验证数据
const count = db.prepare('SELECT COUNT(*) as count FROM knowledge_base').get();
console.log(`📊 知识库条目数: ${count.count}`);

db.close();
```

**执行初始化**:
```bash
node scripts/init-database.js
```

**预期输出**:
```
🔧 正在初始化RAG数据库...
📇 创建索引...
🧪 插入测试数据...
✅ 数据库初始化完成！
📍 数据库位置: H:\HZH\Little-Projects\voice-notification-project\data\rag-database.db
📊 知识库条目数: 2
```

---

### 1.3 实现核心服务

#### 1.3.1 嵌入生成服务

**创建文件**: `services/embedding-service.js`

```javascript
const axios = require('axios');

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
            console.error('嵌入生成失败:', error.message);
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
     * 转换向量为BLOB格式
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
```

#### 1.3.2 混合检索引擎

**创建文件**: `services/hybrid-retrieval.js`

```javascript
const Database = require('better-sqlite3');
const wink = require('wink-bm25-text-search');
const EmbeddingService = require('./embedding-service');

class HybridRetriever {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.embeddingService = new EmbeddingService();
        this.bm25 = wink();
        this.initBM25Index();
    }

    /**
     * 初始化BM25索引
     */
    initBM25Index() {
        console.log('🔍 初始化BM25索引...');

        // 配置BM25
        this.bm25.defineConfig({ fldWeights: { content: 1, keywords: 2 } });
        this.bm25.definePrepTasks([
            // 简单的中文分词（基于空格和标点）
            (text) => text.toLowerCase().split(/[\s\.,;!?，。；！？]+/)
        ]);

        // 加载现有知识库
        const knowledge = this.db.prepare('SELECT id, content, keywords FROM knowledge_base').all();

        knowledge.forEach(item => {
            const keywords = item.keywords ? JSON.parse(item.keywords) : [];
            this.bm25.addDoc({
                content: item.content,
                keywords: keywords.join(' '),
                id: item.id
            }, item.id);
        });

        this.bm25.consolidate();
        console.log(`✅ BM25索引已加载 ${knowledge.length} 条记录`);
    }

    /**
     * 混合检索主函数
     * @param {string} query - 用户查询
     * @param {number} topK - 返回数量
     * @param {number} alpha - 向量权重 (0-1)
     * @returns {Promise<Array>} 排序后的结果
     */
    async retrieve(query, topK = 10, alpha = 0.7) {
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
     * 向量相似度搜索（余弦距离）
     */
    vectorSearch(queryEmbedding, limit) {
        const queryBlob = this.embeddingService.toBlob(queryEmbedding);

        // 简化版向量搜索（逐行计算余弦相似度）
        const allKnowledge = this.db.prepare(`
            SELECT id, content, embedding, layer, layer_weight, user_rating, source_type, source_id
            FROM knowledge_base
        `).all();

        const results = allKnowledge.map(item => {
            const itemEmbedding = this.embeddingService.fromBlob(item.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, itemEmbedding);

            return {
                ...item,
                distance: 1 - similarity, // 转换为距离
                similarity: similarity
            };
        });

        // 按相似度排序
        results.sort((a, b) => b.similarity - a.similarity);

        return results.slice(0, limit);
    }

    /**
     * BM25关键词搜索
     */
    bm25Search(query, limit) {
        const results = this.bm25.search(query, limit);

        // 补充完整信息
        return results.map(result => {
            const item = this.db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(result.id);
            return {
                ...item,
                bm25_score: result.score
            };
        });
    }

    /**
     * RRF (Reciprocal Rank Fusion) 融合
     * 公式: score(d) = Σ(1 / (k + rank(d)))
     */
    reciprocalRankFusion(vectorResults, keywordResults, alpha, k = 60) {
        const scores = new Map();

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
            const item = vectorResults.find(r => r.id === id) || keywordResults.find(r => r.id === id);
            return {
                ...item,
                rrf_score: scores.get(id)
            };
        }).sort((a, b) => b.rrf_score - a.rrf_score);
    }

    /**
     * 应用6层知识分层权重
     */
    applyLayerWeights(results) {
        return results.map(item => {
            let finalScore = item.rrf_score * item.layer_weight;

            // 用户评分调整
            if (item.user_rating) {
                const ratingBoost = (item.user_rating - 3) * 0.1;
                finalScore *= (1 + ratingBoost);
            }

            return {
                ...item,
                final_score: finalScore
            };
        }).sort((a, b) => b.final_score - a.final_score);
    }

    /**
     * 余弦相似度计算
     */
    cosineSimilarity(vecA, vecB) {
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
}

module.exports = HybridRetriever;
```

---

### 1.4 测试验证

#### 1.4.1 创建测试脚本

**创建文件**: `tests/test-retrieval.js`

```javascript
const HybridRetriever = require('../services/hybrid-retrieval');
const path = require('path');

async function runTests() {
    console.log('🧪 开始RAG核心功能测试...\n');

    const dbPath = path.join(__dirname, '../data/rag-database.db');
    const retriever = new HybridRetriever(dbPath);

    // 测试1: 基础检索
    console.log('📝 测试1: 基础检索');
    const results1 = await retriever.retrieve('PowerShell 编码规范', 5);
    console.log('检索结果:');
    results1.forEach((r, i) => {
        console.log(`  ${i + 1}. [L${r.layer}] ${r.content.substring(0, 50)}... (分数: ${r.final_score.toFixed(4)})`);
    });

    // 测试2: 项目相关检索
    console.log('\n📝 测试2: 项目相关检索');
    const results2 = await retriever.retrieve('日志查看器', 5);
    console.log('检索结果:');
    results2.forEach((r, i) => {
        console.log(`  ${i + 1}. [L${r.layer}] ${r.content.substring(0, 50)}... (分数: ${r.final_score.toFixed(4)})`);
    });

    // 测试3: 不同alpha值比较
    console.log('\n📝 测试3: alpha参数影响测试');
    for (const alpha of [0.5, 0.7, 0.9]) {
        const results = await retriever.retrieve('JavaScript', 3, alpha);
        console.log(`  alpha=${alpha}: Top1分数 = ${results[0]?.final_score.toFixed(4)}`);
    }

    console.log('\n✅ 所有测试完成！');
}

runTests().catch(console.error);
```

**执行测试**:
```bash
node tests/test-retrieval.js
```

**预期输出示例**:
```
🧪 开始RAG核心功能测试...

🔍 初始化BM25索引...
✅ BM25索引已加载 2 条记录

📝 测试1: 基础检索
🔍 检索: "PowerShell 编码规范" (Top-5, alpha=0.7)
检索结果:
  1. [L1] PowerShell编码规范：使用批准动词、PascalCase变量命名、UTF-8... (分数: 0.0523)
  2. [L5] 日志查看器项目使用Vanilla JS + Node.js技术栈，采用Pip-Boy... (分数: 0.0187)

📝 测试2: 项目相关检索
🔍 检索: "日志查看器" (Top-5, alpha=0.7)
检索结果:
  1. [L5] 日志查看器项目使用Vanilla JS + Node.js技术栈，采用Pip-Boy... (分数: 0.0321)
  2. [L1] PowerShell编码规范：使用批准动词、PascalCase变量命名、UTF-8... (分数: 0.0098)

📝 测试3: alpha参数影响测试
🔍 检索: "JavaScript" (Top-3, alpha=0.5)
  alpha=0.5: Top1分数 = 0.0298
🔍 检索: "JavaScript" (Top-3, alpha=0.7)
  alpha=0.7: Top1分数 = 0.0312
🔍 检索: "JavaScript" (Top-3, alpha=0.9)
  alpha=0.9: Top1分数 = 0.0289

✅ 所有测试完成！
```

---

### 1.5 验收清单

**Phase 1完成标准**:

- [ ] ✅ Qwen3-embedding:0.6b模型成功部署并可调用
- [ ] ✅ 数据库成功创建，包含所有必要表和索引
- [ ] ✅ 测试数据成功插入（至少2条）
- [ ] ✅ 嵌入服务可正常生成768维向量
- [ ] ✅ 向量检索返回合理结果
- [ ] ✅ BM25关键词检索正常工作
- [ ] ✅ RRF融合算法正确执行
- [ ] ✅ 分层权重正确应用
- [ ] ✅ 测试脚本全部通过

**完成后的产出**:
```
voice-notification-project/
├── data/
│   └── rag-database.db          ✅ 已创建
├── services/
│   ├── embedding-service.js     ✅ 已实现
│   └── hybrid-retrieval.js      ✅ 已实现
├── scripts/
│   └── init-database.js         ✅ 已实现
└── tests/
    └── test-retrieval.js        ✅ 已实现
```

---

## 🔄 Phase 2: 历史画像问卷 (预计2-3天)

### 目标
实现独立的历史画像问卷页面，收集8个核心问题的答案并存入知识库L1层。

### 未来扩展方向（深度画像功能）

**当前版本**（Phase 2 基础实现）：
- 用户直接填写8个问题的答案
- 答案直接存入 user_profile 表和 knowledge_base（L1层）

**未来扩展版**（具体实施时详细设计）：
- **AI深度追问**：基于用户初步回答，使用苏格拉底提问法进行多轮追问
- **深度剖析**：大模型生成深度总结和个性分析
- **用户认可机制**：AI生成的分析需用户审核认可后才存入L1层
- **数据库扩展**：通过 ALTER TABLE 添加字段（initial_answer, followup_conversation, ai_analysis, analysis_approved, final_summary）

> 💡 现阶段保持简单实现，扩展功能在实施时根据实际需求详细设计

### 2.1 前端页面实现

**创建文件**: `viewers/log-viewer/pages/questionnaire.html`

（参考技术栈方案文档中的完整HTML代码）

**关键点**:
- 8个核心问题（life_chapters, education_career, achievements, challenges, skills_evolution, values, influences, life_themes）
- Pip-Boy主题样式
- 自动草稿保存（localStorage）
- 键盘快捷键支持

### 2.2 JavaScript逻辑

**创建文件**: `viewers/log-viewer/js/rag/questionnaire.js`

**核心功能**:
1. 表单验证（所有字段必填）
2. 自动保存草稿（Ctrl+S或每30秒）
3. 提交到后端API
4. 提交后清理草稿

### 2.3 后端API

**在server.js中添加**:

```javascript
app.post('/api/rag/profile', async (req, res) => {
    // 参考技术栈方案文档中的实现
    // 关键步骤：
    // 1. 遍历8个答案
    // 2. 为每个答案生成嵌入
    // 3. 存入user_profile表
    // 4. 同时存入knowledge_base表（L1层，权重5.0）
});
```

### 2.4 验收清单

- [ ] 问卷页面样式符合Pip-Boy主题
- [ ] 所有8个问题均可填写
- [ ] 草稿自动保存和恢复功能正常
- [ ] 提交后数据正确存入两个表
- [ ] 生成的嵌入向量维度正确（768维）
- [ ] 从日志查看器主页可跳转到问卷

---

## ⭐ Phase 3: 评分反馈机制 (预计2天)

### 目标
在日志详情页集成5星评分组件，收集用户反馈并更新检索质量分数。

### 3.1 评分组件

**创建文件**: `viewers/log-viewer/js/rag/rating-widget.js`

（参考技术栈方案文档中的RatingWidget类实现）

### 3.2 集成到日志渲染器

**修改文件**: `viewers/log-viewer/js/log-renderer.js`

在`renderDetail`方法最后添加：
```javascript
const ratingWidget = new RatingWidget(session.id, this.detailPanelEl);
ratingWidget.render();
```

### 3.3 反馈学习模块

**创建文件**: `services/feedback-loop.js`

（参考技术栈方案文档中的FeedbackLearner类实现）

**核心功能**:
1. 记录用户评分
2. 更新retrieval_stats表
3. 重新计算retrieval_score

### 3.4 验收清单

- [ ] 每个日志详情页底部显示评分组件
- [ ] 星星点击和悬停效果正常
- [ ] 评分提交后成功保存
- [ ] retrieval_stats表正确更新
- [ ] retrieval_score自动重新计算
- [ ] 提交后显示成功提示

---

## 🔧 Phase 4-6 简要概述

### Phase 4: 项目总结模块
- 创建项目总结页面
- 实现日志选择和批量总结
- 调用Ollama生成项目分析
- 存储到project_evolution表

### Phase 5: RAG搜索界面
- 创建独立搜索页面
- 实现搜索输入和结果展示
- 添加高级筛选（层级、评分、时间）
- 结果高亮和分页

### Phase 6: 优化与监控
- 批量嵌入处理优化
- 添加缓存机制
- 实现统计仪表盘
- 性能监控和日志

---

## 📚 快速参考

### 常用命令

```bash
# 启动Ollama服务
ollama serve

# 查看已部署的模型
ollama list

# 初始化数据库
node scripts/init-database.js

# 运行检索测试
node tests/test-retrieval.js

# 启动开发服务器（需实现）
npm run dev

# 查看数据库内容
sqlite3 data/rag-database.db "SELECT COUNT(*) FROM knowledge_base;"
```

### 数据库查询示例

```sql
-- 查看所有知识条目
SELECT id, layer, content, user_rating FROM knowledge_base;

-- 查看各层级分布
SELECT layer, COUNT(*) as count, AVG(user_rating) as avg_rating
FROM knowledge_base
GROUP BY layer;

-- 查看高分知识（4星以上）
SELECT * FROM knowledge_base WHERE user_rating >= 4;

-- 查看最近添加的知识
SELECT * FROM knowledge_base ORDER BY created_at DESC LIMIT 10;
```

### 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| Ollama连接失败 | 服务未启动 | 运行 `ollama serve` |
| 数据库锁定 | 多个进程访问 | 关闭所有连接，重启应用 |
| 嵌入生成超时 | 模型加载慢 | 首次调用等待，后续会快 |
| BM25检索无结果 | 索引未初始化 | 重启应用重新加载索引 |
| 向量相似度为0 | 向量未正确存储 | 检查BLOB转换逻辑 |

---

## 📝 进度更新日志

### 2025-01-20

**上午 - 方案设计**:
- ✅ 完成3份需求调研报告的背景分析
- ✅ 确定嵌入模型：Qwen3-Embedding-0.6B（替代nomic-embed-text）
- ✅ 完成完整的RAG架构设计（混合检索、6层知识分类、RLHF反馈）
- ✅ 生成《个性化RAG系统技术栈方案.md》（完整代码示例）
- ✅ 生成《RAG系统实施方案与进度追踪.md》（本文档）

**下午 - 环境清理**:
- ✅ 分析现有 memory.db 数据库（PowerShell VectorMemory系统）
- ✅ 确定双数据库方案（memory.db保留 + 新建rag-database.db）
- ✅ 清理PowerShell VectorMemory相关文件（9个文件）：
  - 模块：VectorMemory.psm1
  - 脚本：Initialize-MemoryDatabase.ps1, Fix-VectorMemoryDatabase.ps1
  - 示例：Example-VectorMemory-Integration.ps1
  - 测试：Test-VectorMemory.ps1, Test-MemoryUsage.ps1
  - 文档：VectorMemory-README.md, VectorMemory使用指南.md, VectorMemory扩展方案-知识库.md
- ✅ 验证保留文件完整性（data/memory.db, lib/依赖库）
- ✅ 更新实施方案文档，记录数据库架构决策

**关键决策**:
- 采用双数据库方案，两个系统独立运行
- 新RAG系统使用Node.js + better-sqlite3 + Qwen3-embedding
- 保留PowerShell系统的数据和依赖库供参考

**下一步**:
- 📋 开始执行 Phase 1: 基础设施搭建
- 创建目录结构（services/, scripts/, tests/）
- 安装Node.js依赖并部署Qwen3模型

### （后续更新）
每次工作会话结束后，在此记录完成的任务和遇到的问题。

---

## 🎯 下一步行动

**Phase 1 立即执行**:
1. 创建项目目录结构（services/, scripts/, tests/）
2. 安装Node.js依赖（better-sqlite3等）
3. 部署Qwen3嵌入模型（639MB）
4. 创建init-database.js脚本并初始化rag-database.db
5. 实现核心服务（embedding-service.js, hybrid-retrieval.js）
6. 编写测试脚本并验证功能

**命令清单**:
```bash
# 1. 创建目录结构
mkdir -p services scripts tests

# 2. 安装Node.js依赖
npm install better-sqlite3 wink-bm25-text-search axios express

# 3. 部署Qwen3嵌入模型（独立于nomic-embed-text）
ollama pull qwen3-embedding:0.6b

# 4. 验证Ollama模型
ollama list
# 应该看到：
# - nomic-embed-text (语音通知系统用)
# - qwen3-embedding:0.6b (RAG系统用)

# 5. 初始化RAG数据库（创建脚本后执行）
node scripts/init-database.js
# 将创建 data/rag-database.db

# 6. 运行检索测试（创建脚本后执行）
node tests/test-retrieval.js
```

**重要提醒**:
- ⚠️ 确保创建的是 `rag-database.db`，不要修改 `memory.db`
- ⚠️ 使用 `qwen3-embedding:0.6b` 模型，不要使用 nomic-embed-text
- ⚠️ Node.js依赖与PowerShell依赖完全独立

---

**文档维护**: 每次工作会话请更新"当前状态"和"进度更新日志"部分
