# 个性化RAG系统技术栈优化方案

> **项目目标**: 为日志查看器集成精准的个性化RAG系统，通过分层知识库训练深度了解壮爸个性化偏好的AI助手
>
> **核心原则**: 精准 > 冗杂 | 质量优先 | 本地隐私 | 可扩展架构
>
> **版本**: 1.0 | **日期**: 2025-01-20 | **作者**: Claude (based on 壮爸's requirements)

---

## 📋 目录

1. [嵌入模型最终推荐](#1-嵌入模型最终推荐)
2. [完整RAG架构设计](#2-完整rag架构设计)
3. [集成方案](#3-集成方案)
4. [实施路线图](#4-实施路线图)
5. [性能优化建议](#5-性能优化建议)

---

## 1. 嵌入模型最终推荐

### 1.1 模型对比分析

| 模型 | MTEB分数 | 大小 | 上下文长度 | 中文支持 | 推荐场景 |
|------|----------|------|------------|----------|----------|
| **Qwen3-Embedding-0.6B** ⭐ | 70.58 (多语言#1) | 639MB | 32K tokens | ✅ 优秀 | **首选方案** |
| BGE-Large-ZH-V1.5 | C-MTEB #1 | 1.34GB | 512 tokens | ✅ 纯中文最强 | 纯中文场景 |
| BGE-M3 | 65+ | ~2GB | 8192 tokens | ✅ 良好 | 多模态需求 |
| nomic-embed-text | 62.39 | 548MB | 8192 tokens | ❌ **不支持中文** | ❌ 不推荐 |

### 1.2 最终推荐：Qwen3-Embedding-0.6B

**选择理由**:
1. **质量最优**: MTEB多语言榜单第一，超越所有开源模型
2. **中文性能卓越**: 专门优化的中文embedding，完美适配壮爸的对话日志
3. **超长上下文**: 32K tokens，可处理完整会话而无需分块
4. **内存友好**: 639MB，适合本地部署
5. **Ollama支持**: 可直接通过 `ollama pull qwen3-embedding:0.6b` 部署
6. **开源协议**: Apache 2.0，商用友好

**部署步骤**:
```bash
# 1. 拉取模型
ollama pull qwen3-embedding:0.6b

# 2. 测试嵌入生成
curl http://localhost:11434/api/embeddings -d '{
  "model": "qwen3-embedding:0.6b",
  "prompt": "测试中文嵌入质量"
}'

# 3. Node.js集成示例
const axios = require('axios');

async function generateEmbedding(text) {
    const response = await axios.post('http://localhost:11434/api/embeddings', {
        model: 'qwen3-embedding:0.6b',
        prompt: text
    });
    return response.data.embedding; // 返回768维向量
}
```

**性能预估** (基于壮爸的500→数千条记录规模):
- 单次嵌入生成: ~100-200ms (本地CPU)
- 批量处理500条: ~1-2分钟
- 查询延迟: <50ms (sqlite-vec)
- 内存占用: 基础639MB + 数据库<100MB

---

## 2. 完整RAG架构设计

### 2.1 技术栈总览

```
┌─────────────────────────────────────────────────────────────┐
│                     前端层 (Vanilla JS)                      │
├─────────────────────────────────────────────────────────────┤
│ • 历史画像问卷模块 (questionnaire.js)                        │
│ • 主观评分组件 (rating-widget.js)                            │
│ • 项目总结面板 (project-summary.js)                          │
│ • RAG搜索界面 (rag-search.js)                                │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                    后端层 (Node.js + Express)                 │
├─────────────────────────────────────────────────────────────┤
│ • 嵌入生成服务 (embedding-service.js)                        │
│ • 混合检索引擎 (hybrid-retrieval.js)                         │
│ • 反馈学习模块 (feedback-loop.js)                            │
│ • 知识分层管理 (knowledge-layers.js)                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                       数据层                                 │
├─────────────────────────────────────────────────────────────┤
│ • SQLite + sqlite-vec (向量存储)                             │
│ • wink-bm25-text-search (关键词索引)                         │
│ • Ollama (qwen3-embedding:0.6b)                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据库Schema设计

#### 2.2.1 向量数据表 (sqlite-vec)

```sql
-- 主知识库表
CREATE TABLE knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 内容字段
    content TEXT NOT NULL,                    -- 原始文本内容
    embedding BLOB NOT NULL,                  -- 768维向量 (qwen3-embedding)

    -- 分层标签 (L1-L6)
    layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 6),
    layer_weight REAL NOT NULL,               -- 权重: 5.0, 4.0, 3.5, 3.0, 2.5, 1.0

    -- 元数据
    source_type TEXT NOT NULL,                -- 'conversation', 'questionnaire', 'project_summary'
    source_id TEXT,                           -- 关联的log session ID或问卷ID
    keywords TEXT,                            -- JSON数组: ["PowerShell", "RAG"]

    -- 质量评分
    user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),  -- 用户主观评分
    retrieval_score REAL DEFAULT 0.0,         -- RLHF调整后的检索分数

    -- 时间戳
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 向量索引
CREATE VIRTUAL TABLE vec_knowledge_base USING vec0(
    embedding FLOAT[768]
);

-- 关键词全文索引
CREATE VIRTUAL TABLE fts_knowledge_base USING fts5(
    content, keywords,
    content=knowledge_base,
    content_rowid=id
);
```

#### 2.2.2 用户画像表

```sql
-- 历史画像问卷答案
CREATE TABLE user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,                -- 'life_chapters', 'education_career', etc.
    answer TEXT NOT NULL,                     -- 用户的详细回答
    embedding BLOB,                           -- 答案的向量表示
    importance_score REAL DEFAULT 1.0,        -- 答案重要性权重
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 项目进化记录
CREATE TABLE project_evolution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    phase TEXT NOT NULL,                      -- 'planning', 'implementation', 'completed'
    key_features TEXT NOT NULL,               -- JSON数组
    challenges TEXT,                          -- 遇到的挑战
    solutions TEXT,                           -- 解决方案
    tech_stack TEXT,                          -- JSON: {"language": "PowerShell", ...}
    embedding BLOB,
    created_at TEXT NOT NULL
);
```

#### 2.2.3 反馈学习表

```sql
-- 用户反馈记录
CREATE TABLE user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,                      -- 用户查询
    retrieved_ids TEXT NOT NULL,              -- JSON数组: [1, 5, 12, ...]
    ratings TEXT NOT NULL,                    -- JSON对象: {"1": 5, "5": 3, "12": 1}
    created_at TEXT NOT NULL
);

-- 检索质量统计
CREATE TABLE retrieval_stats (
    knowledge_id INTEGER PRIMARY KEY,
    total_retrievals INTEGER DEFAULT 0,       -- 总检索次数
    positive_feedback INTEGER DEFAULT 0,      -- 高分反馈次数 (4-5星)
    avg_rating REAL DEFAULT 0.0,              -- 平均评分
    last_retrieved TEXT,                      -- 最后检索时间
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id)
);
```

### 2.3 核心功能模块

#### 2.3.1 混合检索引擎 (Hybrid Retrieval)

**算法**: RRF (Reciprocal Rank Fusion)

```javascript
// hybrid-retrieval.js

const sqlite3 = require('better-sqlite3');
const wink = require('wink-bm25-text-search');

class HybridRetriever {
    constructor(dbPath) {
        this.db = sqlite3(dbPath);
        this.bm25 = wink();
        this.initBM25Index();
    }

    /**
     * 混合检索主函数
     * @param {string} query - 用户查询
     * @param {number} topK - 返回数量 (默认10)
     * @param {number} alpha - 向量权重 (0-1, 默认0.7)
     * @returns {Array} 排序后的检索结果
     */
    async retrieve(query, topK = 10, alpha = 0.7) {
        // 1. 生成查询向量
        const queryEmbedding = await this.generateEmbedding(query);

        // 2. 向量检索 (Semantic Search)
        const vectorResults = this.vectorSearch(queryEmbedding, topK * 2);

        // 3. BM25关键词检索
        const keywordResults = this.bm25.search(query, topK * 2);

        // 4. RRF融合
        const fusedResults = this.reciprocalRankFusion(
            vectorResults,
            keywordResults,
            alpha
        );

        // 5. 应用分层权重
        const weightedResults = this.applyLayerWeights(fusedResults);

        // 6. 返回Top-K
        return weightedResults.slice(0, topK);
    }

    /**
     * 向量相似度搜索
     */
    vectorSearch(queryEmbedding, limit) {
        const stmt = this.db.prepare(`
            SELECT
                kb.id,
                kb.content,
                kb.layer,
                kb.layer_weight,
                kb.user_rating,
                vec_distance(vec_knowledge_base.embedding, ?) AS distance
            FROM knowledge_base kb
            JOIN vec_knowledge_base ON kb.id = vec_knowledge_base.rowid
            ORDER BY distance ASC
            LIMIT ?
        `);

        return stmt.all(queryEmbedding, limit);
    }

    /**
     * RRF融合算法
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

        // 合并并排序
        const allIds = [...new Set([
            ...vectorResults.map(r => r.id),
            ...keywordResults.map(r => r.id)
        ])];

        return allIds
            .map(id => {
                const item = vectorResults.find(r => r.id === id) ||
                            keywordResults.find(r => r.id === id);
                return { ...item, rrf_score: scores.get(id) };
            })
            .sort((a, b) => b.rrf_score - a.rrf_score);
    }

    /**
     * 应用6层知识分层权重
     */
    applyLayerWeights(results) {
        return results.map(item => {
            // 基础得分 * 层级权重
            const finalScore = item.rrf_score * item.layer_weight;

            // 如果有用户评分，进一步调整
            if (item.user_rating) {
                const ratingBoost = (item.user_rating - 3) * 0.1; // 5星+20%, 1星-20%
                return { ...item, final_score: finalScore * (1 + ratingBoost) };
            }

            return { ...item, final_score: finalScore };
        }).sort((a, b) => b.final_score - a.final_score);
    }

    /**
     * 生成嵌入向量
     */
    async generateEmbedding(text) {
        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen3-embedding:0.6b',
                prompt: text
            })
        });

        const data = await response.json();
        return data.embedding;
    }
}

module.exports = HybridRetriever;
```

#### 2.3.2 反馈学习模块 (RLHF)

```javascript
// feedback-loop.js

class FeedbackLearner {
    constructor(db) {
        this.db = db;
    }

    /**
     * 记录用户对检索结果的评分
     * @param {string} query - 查询文本
     * @param {Array} results - 检索结果 [{id, content, score}, ...]
     * @param {Object} ratings - 评分 {id: rating}
     */
    recordFeedback(query, results, ratings) {
        // 1. 保存反馈记录
        const stmt = this.db.prepare(`
            INSERT INTO user_feedback (query, retrieved_ids, ratings)
            VALUES (?, ?, ?)
        `);

        stmt.run(
            query,
            JSON.stringify(results.map(r => r.id)),
            JSON.stringify(ratings)
        );

        // 2. 更新每条知识的统计信息
        for (const [knowledgeId, rating] of Object.entries(ratings)) {
            this.updateRetrievalStats(parseInt(knowledgeId), rating);
        }

        // 3. 更新知识库中的retrieval_score
        this.recomputeRetrievalScores();
    }

    /**
     * 更新检索统计
     */
    updateRetrievalStats(knowledgeId, rating) {
        const stmt = this.db.prepare(`
            INSERT INTO retrieval_stats (knowledge_id, total_retrievals, positive_feedback, avg_rating, last_retrieved)
            VALUES (?, 1, ?, ?, datetime('now'))
            ON CONFLICT(knowledge_id) DO UPDATE SET
                total_retrievals = total_retrievals + 1,
                positive_feedback = positive_feedback + (CASE WHEN ? >= 4 THEN 1 ELSE 0 END),
                avg_rating = (avg_rating * total_retrievals + ?) / (total_retrievals + 1),
                last_retrieved = datetime('now')
        `);

        const positiveIncrement = rating >= 4 ? 1 : 0;
        stmt.run(knowledgeId, positiveIncrement, rating, rating, rating);
    }

    /**
     * 重新计算所有知识的检索分数
     * 使用公式: retrieval_score = (positive_rate * 0.7) + (avg_rating / 5 * 0.3)
     */
    recomputeRetrievalScores() {
        const stmt = this.db.prepare(`
            UPDATE knowledge_base
            SET retrieval_score = (
                SELECT
                    (CAST(rs.positive_feedback AS REAL) / rs.total_retrievals * 0.7) +
                    (rs.avg_rating / 5.0 * 0.3)
                FROM retrieval_stats rs
                WHERE rs.knowledge_id = knowledge_base.id
            )
            WHERE id IN (SELECT knowledge_id FROM retrieval_stats)
        `);

        stmt.run();
    }

    /**
     * 获取高质量知识 (用于优化检索排序)
     */
    getHighQualityKnowledge(threshold = 0.7) {
        const stmt = this.db.prepare(`
            SELECT kb.*, rs.avg_rating, rs.total_retrievals
            FROM knowledge_base kb
            JOIN retrieval_stats rs ON kb.id = rs.knowledge_id
            WHERE kb.retrieval_score >= ?
            ORDER BY kb.retrieval_score DESC
        `);

        return stmt.all(threshold);
    }
}

module.exports = FeedbackLearner;
```

---

## 3. 集成方案

### 3.1 前端模块集成 (Vanilla JS)

#### 3.1.1 目录结构

```
viewers/log-viewer/
├── index.html                    # 主页面 (已存在)
├── js/
│   ├── app.js                    # 主应用 (已存在)
│   ├── session-manager.js        # 会话管理 (已存在)
│   ├── log-renderer.js           # 日志渲染 (已存在)
│   │
│   ├── rag/
│   │   ├── questionnaire.js      # 【新增】历史画像问卷模块
│   │   ├── rating-widget.js      # 【新增】主观评分组件
│   │   ├── project-summary.js    # 【新增】项目总结面板
│   │   └── rag-search.js         # 【新增】RAG搜索界面
│   │
│   └── utils/
│       └── api-client.js         # 【新增】API请求封装
│
├── pages/
│   ├── questionnaire.html        # 【新增】独立问卷页面
│   └── project-summary.html      # 【新增】项目总结页面
│
└── css/
    └── rag-modules.css           # 【新增】RAG模块样式 (基于Pip-Boy主题)
```

#### 3.1.2 导航栏扩展

**在 `index.html` 中添加导航按钮**:

```html
<!-- 在 pip-boy-header 中添加 -->
<div class="pip-boy-header log-viewer-header">
    <h1 class="pip-boy-glow-multi">ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</h1>
    <p>COPYRIGHT 2075-2077 ROBCO INDUSTRIES</p>
    <p>-LOG VIEWER MODULE-</p>

    <!-- 【新增】模块切换导航 -->
    <nav class="module-nav" style="margin-top: 15px; padding: 10px; border-top: 1px solid var(--pip-boy-border-dim);">
        <button class="nav-btn active" data-module="logs">
            <span class="nav-icon">📜</span> LOGS
        </button>
        <button class="nav-btn" data-module="questionnaire">
            <span class="nav-icon">📋</span> PROFILE
        </button>
        <button class="nav-btn" data-module="projects">
            <span class="nav-icon">🔧</span> PROJECTS
        </button>
        <button class="nav-btn" data-module="search">
            <span class="nav-icon">🔍</span> RAG SEARCH
        </button>
    </nav>
</div>
```

**对应的CSS样式** (`css/rag-modules.css`):

```css
/* 模块导航按钮 */
.module-nav {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
}

.nav-btn {
    background: rgba(74, 246, 38, 0.1);
    border: 2px solid var(--pip-boy-border-dim);
    color: var(--pip-boy-text-primary);
    padding: 10px 20px;
    font-family: 'VT323', monospace;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-shadow: 0 0 5px var(--pip-boy-glow-mid);
}

.nav-btn:hover {
    background: rgba(74, 246, 38, 0.3);
    border-color: var(--pip-boy-border);
    box-shadow: 0 0 15px var(--pip-boy-shadow);
    transform: translateY(-2px);
}

.nav-btn.active {
    background: var(--pip-boy-highlight);
    border-color: var(--pip-boy-border);
    box-shadow: inset 0 0 10px var(--pip-boy-screen-tint);
}

.nav-icon {
    margin-right: 5px;
}
```

#### 3.1.3 主观评分组件 (rating-widget.js)

**集成到日志详情页**:

```javascript
// js/rag/rating-widget.js

class RatingWidget {
    constructor(sessionId, detailPanelEl) {
        this.sessionId = sessionId;
        this.container = detailPanelEl;
        this.rating = 0;
    }

    /**
     * 渲染评分组件
     */
    render() {
        const ratingHTML = `
            <div class="rating-section" style="
                margin-top: 30px;
                padding: 20px;
                border-top: 2px solid var(--pip-boy-border-dim);
                background: rgba(74, 246, 38, 0.05);
            ">
                <h3 style="margin-bottom: 15px; color: var(--pip-boy-text-bright);">
                    📊 知识质量评分
                </h3>
                <p style="margin-bottom: 10px; color: var(--pip-boy-text-secondary); font-size: 14px;">
                    此对话对于了解你的个性化特点有多大价值？
                </p>

                <div class="star-rating" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <button class="star-btn" data-star="${star}" style="
                            background: transparent;
                            border: 2px solid var(--pip-boy-border-dim);
                            color: var(--pip-boy-text-dim);
                            font-size: 28px;
                            cursor: pointer;
                            padding: 5px 15px;
                            transition: all 0.2s;
                        ">★</button>
                    `).join('')}
                </div>

                <textarea
                    id="rating-note"
                    placeholder="可选：说明为什么给这个评分..."
                    style="
                        width: 100%;
                        min-height: 80px;
                        background: rgba(0, 0, 0, 0.5);
                        border: 1px solid var(--pip-boy-border-dim);
                        color: var(--pip-boy-text-primary);
                        padding: 10px;
                        font-family: 'Courier New', monospace;
                        resize: vertical;
                    "
                ></textarea>

                <button id="submit-rating" class="pip-boy-btn" style="
                    margin-top: 10px;
                    padding: 10px 25px;
                    background: rgba(74, 246, 38, 0.2);
                    border: 2px solid var(--pip-boy-border);
                    color: var(--pip-boy-text-bright);
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                " disabled>
                    提交评分
                </button>
            </div>
        `;

        // 插入到详情面板底部
        this.container.insertAdjacentHTML('beforeend', ratingHTML);

        // 绑定事件
        this.attachEvents();
    }

    /**
     * 绑定事件监听
     */
    attachEvents() {
        const stars = this.container.querySelectorAll('.star-btn');
        const submitBtn = this.container.querySelector('#submit-rating');

        // 星星点击
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                this.rating = parseInt(e.target.dataset.star);
                this.updateStars();
                submitBtn.disabled = false;
            });

            // 悬停效果
            star.addEventListener('mouseenter', (e) => {
                const hoverRating = parseInt(e.target.dataset.star);
                stars.forEach((s, idx) => {
                    if (idx < hoverRating) {
                        s.style.color = 'var(--pip-boy-text-bright)';
                        s.style.textShadow = '0 0 10px var(--pip-boy-glow-bright)';
                    }
                });
            });

            star.addEventListener('mouseleave', () => {
                this.updateStars();
            });
        });

        // 提交按钮
        submitBtn.addEventListener('click', () => {
            this.submitRating();
        });
    }

    /**
     * 更新星星显示
     */
    updateStars() {
        const stars = this.container.querySelectorAll('.star-btn');
        stars.forEach((star, idx) => {
            if (idx < this.rating) {
                star.style.color = 'var(--pip-boy-warning)'; // 黄色高亮
                star.style.borderColor = 'var(--pip-boy-warning)';
                star.style.textShadow = '0 0 15px var(--pip-boy-warning)';
            } else {
                star.style.color = 'var(--pip-boy-text-dim)';
                star.style.borderColor = 'var(--pip-boy-border-dim)';
                star.style.textShadow = 'none';
            }
        });
    }

    /**
     * 提交评分到后端
     */
    async submitRating() {
        const note = this.container.querySelector('#rating-note').value;

        try {
            const response = await fetch('/api/rag/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    rating: this.rating,
                    note: note
                })
            });

            if (response.ok) {
                // 显示成功提示
                this.showSuccess();
            }
        } catch (error) {
            console.error('评分提交失败:', error);
            this.showError();
        }
    }

    /**
     * 显示成功提示
     */
    showSuccess() {
        const submitBtn = this.container.querySelector('#submit-rating');
        submitBtn.textContent = '✅ 评分已保存';
        submitBtn.disabled = true;
        submitBtn.style.background = 'rgba(74, 246, 38, 0.4)';

        // 3秒后恢复
        setTimeout(() => {
            submitBtn.textContent = '提交评分';
            submitBtn.style.background = 'rgba(74, 246, 38, 0.2)';
        }, 3000);
    }

    showError() {
        alert('评分提交失败，请稍后重试');
    }
}

// 导出
window.RatingWidget = RatingWidget;
```

**在 `log-renderer.js` 中集成**:

```javascript
// 在 renderDetail 方法中添加
renderDetail(session) {
    // ... 原有渲染代码 ...

    // 【新增】添加评分组件
    const ratingWidget = new RatingWidget(session.id, this.detailPanelEl);
    ratingWidget.render();
}
```

#### 3.1.4 历史画像问卷模块 (questionnaire.js)

**独立页面** (`pages/questionnaire.html`):

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>历史画像问卷 - Pip-Boy</title>
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-colors.css">
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-base.css">
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-crt.css">
    <link rel="stylesheet" href="../css/rag-modules.css">
</head>
<body>
    <div class="pip-boy-container pip-boy-scanlines pip-boy-flicker-subtle">
        <div class="pip-boy-screen pip-boy-box-glow">
            <div class="pip-boy-layout-hcf">
                <div class="pip-boy-header" style="text-align: center; padding: 20px;">
                    <h1 class="pip-boy-glow-multi">PERSONAL HISTORY PROFILE</h1>
                    <p>个性化AI助手训练 - 历史画像采集</p>
                </div>

                <div class="pip-boy-body" style="padding: 30px; overflow-y: auto;">
                    <div class="questionnaire-intro" style="margin-bottom: 30px; padding: 20px; background: rgba(74, 246, 38, 0.1); border: 2px solid var(--pip-boy-border-dim);">
                        <h2 style="margin-bottom: 10px;">📋 关于本问卷</h2>
                        <p style="line-height: 1.8; color: var(--pip-boy-text-secondary);">
                            此问卷旨在收集你的核心个人特质，帮助AI助手深度理解你的价值观、工作风格、技术偏好等。
                            <br><strong>预计时间：15-20分钟</strong> | <strong>一次性任务</strong>
                        </p>
                    </div>

                    <!-- 8个核心问题 -->
                    <form id="profile-form">
                        <!-- 问题1: 人生章节 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q1</span>
                                请将你的人生划分为3-5个重要章节，并简述每个阶段的主题
                            </label>
                            <textarea
                                name="life_chapters"
                                required
                                placeholder="例如：\n第一章节（2010-2015）：探索期 - 大学时代，尝试多种技术栈...\n第二章节（2016-2020）：..."></textarea>
                        </div>

                        <!-- 问题2: 教育与职业 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q2</span>
                                描述你的教育背景和职业路径，重点说明关键转折点
                            </label>
                            <textarea name="education_career" required></textarea>
                        </div>

                        <!-- 问题3: 重要成就 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q3</span>
                                列举2-3个你最自豪的项目或成就，以及为什么它们对你重要
                            </label>
                            <textarea name="achievements" required></textarea>
                        </div>

                        <!-- 问题4: 挑战与应对 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q4</span>
                                分享一个重大挑战或失败经历，以及你如何应对和成长
                            </label>
                            <textarea name="challenges" required></textarea>
                        </div>

                        <!-- 问题5: 技能演进 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q5</span>
                                描述你的核心技能如何随时间演化（技术栈、工作方法等）
                            </label>
                            <textarea name="skills_evolution" required></textarea>
                        </div>

                        <!-- 问题6: 价值观 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q6</span>
                                什么价值观或原则一直指导着你的决策？举例说明
                            </label>
                            <textarea name="values" required></textarea>
                        </div>

                        <!-- 问题7: 重要影响 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q7</span>
                                谁（导师/同事/作品）对你影响最大？具体体现在哪些方面？
                            </label>
                            <textarea name="influences" required></textarea>
                        </div>

                        <!-- 问题8: 人生主题 -->
                        <div class="question-block">
                            <label class="question-label">
                                <span class="question-number">Q8</span>
                                用2-3个关键词总结你的"人生主题"，并解释原因
                            </label>
                            <textarea name="life_themes" required placeholder="例如：探索、创造、严谨"></textarea>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <button type="submit" class="submit-btn pip-boy-btn-large">
                                🚀 提交问卷并生成画像
                            </button>
                        </div>
                    </form>
                </div>

                <div class="pip-boy-footer">
                    <kbd>Tab</kbd> 下一题 | <kbd>Shift+Tab</kbd> 上一题 | <kbd>Ctrl+S</kbd> 保存草稿
                </div>
            </div>
        </div>
    </div>

    <script src="../js/rag/questionnaire.js"></script>
</body>
</html>
```

**对应的CSS** (添加到 `css/rag-modules.css`):

```css
/* 问卷样式 */
.question-block {
    margin-bottom: 35px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--pip-boy-border-dim);
    border-left: 4px solid var(--pip-boy-border);
}

.question-label {
    display: block;
    margin-bottom: 12px;
    font-size: 16px;
    line-height: 1.6;
    color: var(--pip-boy-text-bright);
}

.question-number {
    display: inline-block;
    background: var(--pip-boy-highlight);
    padding: 3px 10px;
    margin-right: 10px;
    border: 1px solid var(--pip-boy-border);
    font-weight: bold;
    color: var(--pip-boy-text-bright);
}

.question-block textarea {
    width: 100%;
    min-height: 120px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid var(--pip-boy-border-dim);
    color: var(--pip-boy-text-primary);
    padding: 15px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    transition: all 0.3s;
}

.question-block textarea:focus {
    outline: none;
    border-color: var(--pip-boy-border);
    box-shadow: inset 0 0 15px var(--pip-boy-screen-tint);
}

.submit-btn {
    padding: 15px 40px;
    font-size: 20px;
    background: rgba(74, 246, 38, 0.3);
    border: 3px solid var(--pip-boy-border);
    color: var(--pip-boy-text-bright);
    cursor: pointer;
    font-family: 'VT323', monospace;
    text-shadow: 0 0 10px var(--pip-boy-glow-mid);
    transition: all 0.3s;
}

.submit-btn:hover {
    background: rgba(74, 246, 38, 0.5);
    box-shadow: 0 0 25px var(--pip-boy-shadow);
    transform: scale(1.05);
}
```

**JavaScript处理** (`js/rag/questionnaire.js`):

```javascript
// 表单提交处理
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const answers = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/rag/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers)
        });

        if (response.ok) {
            alert('✅ 画像问卷已提交！AI助手正在学习你的个性特点...');
            window.location.href = '../index.html';
        }
    } catch (error) {
        alert('❌ 提交失败，请稍后重试');
        console.error(error);
    }
});

// 自动保存草稿 (Ctrl+S)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDraft();
    }
});

function saveDraft() {
    const formData = new FormData(document.getElementById('profile-form'));
    localStorage.setItem('questionnaire_draft', JSON.stringify(Object.fromEntries(formData)));
    showNotification('草稿已保存');
}

// 加载草稿
window.addEventListener('load', () => {
    const draft = localStorage.getItem('questionnaire_draft');
    if (draft) {
        const data = JSON.parse(draft);
        for (const [key, value] of Object.entries(data)) {
            const field = document.querySelector(`[name="${key}"]`);
            if (field) field.value = value;
        }
    }
});
```

### 3.2 后端API设计

#### 3.2.1 API端点列表

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| `/api/rag/profile` | POST | 提交历史画像问卷 | `{life_chapters, education_career, ...}` | `{success: true, profile_id}` |
| `/api/rag/feedback` | POST | 提交会话评分 | `{session_id, rating, note}` | `{success: true}` |
| `/api/rag/search` | GET | 混合检索 | `?query=xxx&topK=10` | `[{id, content, score, layer}]` |
| `/api/rag/project-summary` | POST | 生成项目总结 | `{project_name, log_ids[]}` | `{summary, key_features, tech_stack}` |
| `/api/rag/embed` | POST | 生成嵌入向量 | `{text}` | `{embedding: [0.1, ...]}` |
| `/api/rag/stats` | GET | 获取RAG统计 | - | `{total_knowledge, avg_rating, layers}` |

#### 3.2.2 核心API实现示例

**`server.js` (Node.js + Express)**:

```javascript
const express = require('express');
const sqlite3 = require('better-sqlite3');
const HybridRetriever = require('./services/hybrid-retrieval');
const FeedbackLearner = require('./services/feedback-loop');
const EmbeddingService = require('./services/embedding-service');

const app = express();
app.use(express.json());

// 初始化服务
const db = sqlite3('data/rag-database.db');
const retriever = new HybridRetriever(db);
const feedbackLearner = new FeedbackLearner(db);
const embeddingService = new EmbeddingService('http://localhost:11434');

// API 1: 提交历史画像问卷
app.post('/api/rag/profile', async (req, res) => {
    try {
        const answers = req.body; // {life_chapters, education_career, ...}

        // 逐条处理每个问题的答案
        for (const [questionId, answer] of Object.entries(answers)) {
            // 1. 生成嵌入
            const embedding = await embeddingService.generate(answer);

            // 2. 存入用户画像表
            const stmt = db.prepare(`
                INSERT INTO user_profile (question_id, answer, embedding, importance_score)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(questionId, answer, Buffer.from(new Float32Array(embedding).buffer), 1.0);

            // 3. 同时存入知识库 (L1 核心价值层)
            const kbStmt = db.prepare(`
                INSERT INTO knowledge_base (content, embedding, layer, layer_weight, source_type, source_id)
                VALUES (?, ?, 1, 5.0, 'questionnaire', ?)
            `);
            kbStmt.run(answer, Buffer.from(new Float32Array(embedding).buffer), questionId);
        }

        res.json({ success: true, message: '画像问卷已保存' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '问卷保存失败' });
    }
});

// API 2: 提交会话评分
app.post('/api/rag/feedback', async (req, res) => {
    const { session_id, rating, note } = req.body;

    try {
        // 1. 更新对应知识条目的评分
        const stmt = db.prepare(`
            UPDATE knowledge_base
            SET user_rating = ?
            WHERE source_type = 'conversation' AND source_id = ?
        `);
        stmt.run(rating, session_id);

        // 2. 记录反馈 (用于RLHF)
        feedbackLearner.recordFeedback(
            `session:${session_id}`,
            [{ id: session_id }],
            { [session_id]: rating }
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '评分保存失败' });
    }
});

// API 3: 混合检索
app.get('/api/rag/search', async (req, res) => {
    const { query, topK = 10 } = req.query;

    try {
        const results = await retriever.retrieve(query, parseInt(topK));
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '检索失败' });
    }
});

// API 4: 生成项目总结
app.post('/api/rag/project-summary', async (req, res) => {
    const { project_name, log_ids } = req.body;

    try {
        // 1. 获取所有相关日志
        const logs = db.prepare(`
            SELECT content FROM knowledge_base
            WHERE source_id IN (${log_ids.map(() => '?').join(',')})
        `).all(...log_ids);

        // 2. 合并内容
        const fullContext = logs.map(l => l.content).join('\n\n');

        // 3. 调用Ollama生成总结
        const summary = await callOllamaForSummary(project_name, fullContext);

        // 4. 存储项目进化记录
        const embedding = await embeddingService.generate(summary);
        db.prepare(`
            INSERT INTO project_evolution (project_name, phase, key_features, embedding)
            VALUES (?, 'completed', ?, ?)
        `).run(project_name, summary, Buffer.from(new Float32Array(embedding).buffer));

        res.json({ summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '总结生成失败' });
    }
});

// 辅助函数: 调用Ollama生成总结
async function callOllamaForSummary(projectName, context) {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'qwen2.5:7b-instruct',
            prompt: `作为一个项目分析助手，请总结以下项目的核心特点、技术栈和关键进展：\n\n项目名称：${projectName}\n\n对话日志：\n${context}\n\n请用结构化格式输出：核心特点、技术栈、关键挑战、解决方案。`,
            stream: false
        })
    });

    const data = await response.json();
    return data.response;
}

app.listen(3000, () => {
    console.log('RAG服务已启动: http://localhost:3000');
});
```

---

## 4. 实施路线图

### Phase 1: 基础设施搭建 (1-2天)

**目标**: 建立RAG核心引擎

- [ ] 安装依赖
  ```bash
  npm install better-sqlite3 wink-bm25-text-search axios express
  ```
- [ ] 部署Qwen3嵌入模型
  ```bash
  ollama pull qwen3-embedding:0.6b
  ```
- [ ] 初始化数据库 (执行上述SQL schema)
- [ ] 实现 `embedding-service.js`
- [ ] 实现 `hybrid-retrieval.js` 核心检索逻辑
- [ ] 测试向量存储和检索

**验收标准**:
- 能够将文本转换为768维向量
- 能够执行基本的向量相似度搜索
- BM25关键词搜索正常工作

---

### Phase 2: 历史画像问卷 (2-3天)

**目标**: 完成一次性画像采集

- [ ] 创建 `pages/questionnaire.html`
- [ ] 实现 `js/rag/questionnaire.js`
- [ ] 实现 `/api/rag/profile` 后端API
- [ ] 添加草稿保存功能 (localStorage)
- [ ] 设计问卷结果展示页面

**验收标准**:
- 8个核心问题全部可填写
- 提交后答案正确存入 `user_profile` 和 `knowledge_base`
- 草稿自动保存和恢复功能正常

---

### Phase 3: 评分反馈机制 (2天)

**目标**: 集成主观评分到日志详情页

- [ ] 实现 `js/rag/rating-widget.js`
- [ ] 修改 `log-renderer.js` 集成评分组件
- [ ] 实现 `/api/rag/feedback` 后端API
- [ ] 实现 `feedback-loop.js` RLHF逻辑
- [ ] 测试评分数据流

**验收标准**:
- 每个日志详情页底部显示评分组件
- 评分提交后正确更新 `user_rating` 和 `retrieval_stats`
- `retrieval_score` 自动重新计算

---

### Phase 4: 项目总结模块 (3天)

**目标**: 自动生成项目特点和进展总结

- [ ] 创建 `pages/project-summary.html`
- [ ] 实现 `js/rag/project-summary.js`
- [ ] 实现 `/api/rag/project-summary` API
- [ ] 集成Ollama生成总结
- [ ] 设计项目时间线可视化

**验收标准**:
- 能够选择多个日志生成项目总结
- 总结包含：核心特点、技术栈、关键挑战、解决方案
- 总结结果存入 `project_evolution` 表

---

### Phase 5: RAG搜索界面 (2天)

**目标**: 提供独立的知识库搜索功能

- [ ] 创建搜索界面 UI
- [ ] 实现混合检索展示
- [ ] 添加高级筛选 (按层级、按评分、按时间)
- [ ] 实现搜索结果高亮

**验收标准**:
- 输入查询后返回Top-10相关知识
- 显示每条结果的层级、评分、来源
- 支持按层级筛选 (仅L1-L2 / 全部层级)

---

### Phase 6: 优化与监控 (持续)

**目标**: 性能优化和质量监控

- [ ] 实现批量嵌入生成 (提升吞吐量)
- [ ] 添加向量索引优化 (如使用HNSW)
- [ ] 实现知识库统计仪表盘
- [ ] 添加日志记录和错误追踪
- [ ] A/B测试不同alpha值 (向量vs关键词权重)

**验收标准**:
- 1000条记录下检索延迟 <100ms
- 仪表盘显示：知识库大小、平均评分、各层级分布
- 错误日志完整记录

---

## 5. 性能优化建议

### 5.1 扩展性考虑 (500 → 数千条)

**当前架构优势**:
- **sqlite-vec**: 支持百万级向量，500-5000条完全无压力
- **better-sqlite3**: 同步API，性能优于异步node-sqlite3
- **BM25**: 内存索引，毫秒级响应

**潜在瓶颈**:
1. **嵌入生成速度**: 单条100-200ms，批量处理时需优化
2. **向量搜索**: 超过1万条后可能需要HNSW索引
3. **磁盘I/O**: 大量并发查询时可能成为瓶颈

**优化方案**:

#### 5.1.1 批量嵌入生成

```javascript
class EmbeddingService {
    async generateBatch(texts, batchSize = 10) {
        const results = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            // 并发生成
            const embeddings = await Promise.all(
                batch.map(text => this.generate(text))
            );

            results.push(...embeddings);
        }

        return results;
    }
}
```

#### 5.1.2 向量索引优化

```sql
-- 为高频查询的层级添加索引
CREATE INDEX idx_layer_rating ON knowledge_base(layer, user_rating DESC);

-- 时间范围查询索引
CREATE INDEX idx_created_at ON knowledge_base(created_at DESC);

-- 复合索引 (source_type + source_id)
CREATE INDEX idx_source ON knowledge_base(source_type, source_id);
```

#### 5.1.3 缓存策略

```javascript
const NodeCache = require('node-cache');
const embeddingCache = new NodeCache({ stdTTL: 3600 }); // 1小时缓存

async function getCachedEmbedding(text) {
    const cacheKey = Buffer.from(text).toString('base64').slice(0, 32);

    let embedding = embeddingCache.get(cacheKey);
    if (!embedding) {
        embedding = await generateEmbedding(text);
        embeddingCache.set(cacheKey, embedding);
    }

    return embedding;
}
```

### 5.2 数据增长监控

**自动清理策略** (可选):

```sql
-- 删除低价值临时知识 (L6层 + 低评分 + 6个月前)
DELETE FROM knowledge_base
WHERE layer = 6
  AND user_rating <= 2
  AND created_at < datetime('now', '-6 months');
```

**定期统计**:

```javascript
// 每日统计任务
const cron = require('node-cron');

cron.schedule('0 2 * * *', () => { // 每天凌晨2点
    const stats = db.prepare(`
        SELECT
            layer,
            COUNT(*) as count,
            AVG(user_rating) as avg_rating,
            SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) as new_last_month
        FROM knowledge_base
        GROUP BY layer
    `).all();

    console.log('知识库统计:', stats);

    // 可选：发送到监控系统
});
```

---

## 附录

### A. 6层知识分类详细说明

| 层级 | 名称 | 权重 | 示例内容 | 保留期限 |
|------|------|------|----------|----------|
| L1 | 核心价值/原则 | 5.0 | "我坚持代码必须有完整注释" | 永久 |
| L2 | 工作习惯 | 4.0 | "我每天早上9点开始工作" | 永久 |
| L3 | 技术偏好 | 3.5 | "我偏好PowerShell而非Python" | 长期 |
| L4 | 沟通风格 | 3.0 | "我倾向于直接简洁的表达" | 长期 |
| L5 | 项目上下文 | 2.5 | "日志查看器使用Vanilla JS" | 中期 (1年) |
| L6 | 临时信息 | 1.0 | "今天修复了一个边界条件bug" | 短期 (6个月) |

### B. 技术栈依赖清单

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "wink-bm25-text-search": "^2.0.5",
    "axios": "^1.6.0",
    "node-cron": "^3.0.3",
    "node-cache": "^5.1.2"
  }
}
```

### C. 数据库初始化脚本

```bash
# init-rag-db.sh
#!/bin/bash

sqlite3 data/rag-database.db <<'END_SQL'
-- 执行上述所有CREATE TABLE语句
...
END_SQL

echo "✅ RAG数据库初始化完成"
```

---

## 📞 后续支持

如果在实施过程中遇到问题，可以参考：
- **Qwen3 Embedding文档**: https://github.com/QwenLM/Qwen2.5
- **sqlite-vec GitHub**: https://github.com/asg017/sqlite-vec
- **wink-bm25文档**: https://winkjs.org/wink-bm25-text-search/

**下一步**: 建议先完成Phase 1基础设施搭建，验证核心检索功能后再逐步添加前端模块。

---

**文档版本**: 1.0
**最后更新**: 2025-01-20
**维护者**: 壮爸 + Claude
