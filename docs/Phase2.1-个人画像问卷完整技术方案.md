# Phase 2.1 个人画像问卷完整技术方案

> **项目**: RAG 系统 - 个人历史画像深度采集
>
> **核心定位**: 一次性重要语录提取，初期设计至关重要
>
> **技术栈**: Vanilla JS + Express + SQLite + Ollama (qwen2.5:7b-instruct)
>
> **创建日期**: 2025-11-23 | **维护者**: 壮爸

---

## 📋 目录

1. [核心设计理念](#核心设计理念)
2. [两层数据库架构](#两层数据库架构)
3. [完整交互流程](#完整交互流程)
4. [数据库Schema设计](#数据库schema设计)
5. [API接口设计](#api接口设计)
6. [前端界面设计](#前端界面设计)
7. [AI服务设计](#ai服务设计)
8. [实施步骤](#实施步骤)

---

## 🎯 核心设计理念

### 为什么需要两层架构？

**第一层（基础问卷）**：
- 8 个核心问题，覆盖人生主要维度
- 用户自由回答，无字数限制
- 直接存储原始回答

**第二层（深度追问）**：
- 基于第一层的每个回答，AI 进行苏格拉底式追问
- 多轮对话挖掘深层信息
- AI 生成深度分析总结
- **用户认可机制**：分析结论必须经过用户审核认可
- 只有用户认可的内容才存入 knowledge_base (L1层)

### 设计原则

1. **一次性正确**：这是用户的重要语录，必须精准采集，避免后续频繁修改
2. **用户主导**：AI 辅助但不替代，用户保留最终决定权
3. **渐进式深入**：从基础问题到深度追问，循序渐进
4. **Pip-Boy 主题贯穿**：所有界面统一使用 Pip-Boy CRT 风格
5. **关键词暂缓**：先验证核心流程，Phase 2.2 再补充关键词提取

---

## 🗄️ 两层数据库架构

### 架构图解

```
用户填写 8 个问题
       ↓
┌──────────────────────────────────────────┐
│  第一层：user_profile 表                   │
│  - question_id (例如: life_chapters)      │
│  - initial_answer (用户原始回答)            │
│  - status (pending/in_followup/completed) │
└──────────────────────────────────────────┘
       ↓
    AI 深度追问（基于每个问题）
       ↓
┌──────────────────────────────────────────┐
│  第二层：user_profile_followup 表          │
│  - profile_id (关联第一层)                 │
│  - followup_question (AI追问的问题)        │
│  - user_answer (用户回答)                  │
│  - ai_analysis (AI深度分析，待用户认可)      │
│  - user_approved (用户是否认可，默认false)  │
│  - final_summary (用户认可后的最终总结)     │
└──────────────────────────────────────────┘
       ↓
    用户认可 AI 分析
       ↓
┌──────────────────────────────────────────┐
│  knowledge_base 表 (L1层, weight=5.0)     │
│  - content (第一层 + 第二层的认可内容)      │
│  - embedding (768维向量)                  │
│  - layer = 1                             │
│  - source_type = 'user_profile'          │
└──────────────────────────────────────────┘
```

### 数据流转说明

**阶段 1: 基础问卷填写**
```
用户 → 填写 8 个问题 → user_profile (status=pending)
```

**阶段 2: 深度追问（逐个问题处理）**
```
AI → 读取 user_profile[0].initial_answer → 生成追问 → 用户回答
   → 多轮对话存入 user_profile_followup
   → AI 生成深度分析 (ai_analysis)
   → 用户审核认可 (user_approved=true)
   → 更新 final_summary
   → user_profile[0].status = completed
   → 处理下一个问题
```

**阶段 3: 存入知识库**
```
定时任务/手动触发 → 读取所有 user_approved=true 的记录
                 → 组合 initial_answer + final_summary
                 → 生成 embedding
                 → 存入 knowledge_base (L1, weight=5.0)
```

---

## 🔄 完整交互流程

### 流程 1: 基础问卷填写

**页面**: `questionnaire.html`

```
┌────────────────────────────────────────────┐
│  ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM │
│  PIP-BOY 个人历史画像问卷                    │
├────────────────────────────────────────────┤
│                                            │
│  问题 1/8: 生命章节与转折点                  │
│  ┌──────────────────────────────────────┐ │
│  │ 如果把你的人生比作一本书，会分为哪几个   │ │
│  │ 主要章节？请为每章命名...               │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ [用户输入区域 - textarea]              │ │
│  │                                        │ │
│  │                                        │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [上一题] [保存草稿] [下一题]              │
│  进度: ████████░░░░░░░░ 1/8               │
└────────────────────────────────────────────┘
```

**交互逻辑**:
1. 用户逐题填写（支持前后跳转）
2. 自动保存草稿到 localStorage（每 30 秒或按 Ctrl+S）
3. 填写完 8 题后，点击"提交问卷"
4. 调用 `POST /api/rag/profile/submit` 存入第一层数据库

---

### 流程 2: AI 深度追问

**页面**: `followup.html`

```
┌────────────────────────────────────────────┐
│  深度对话：生命章节与转折点                  │
├────────────────────────────────────────────┤
│  您的回答：                                 │
│  ┌──────────────────────────────────────┐ │
│  │ 第一章：探索期（0-18岁）...            │ │
│  │ 第二章：迷茫期（18-25岁）...           │ │
│  └──────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│  AI 追问历史：                              │
│  ┌──────────────────────────────────────┐ │
│  │ 🤖 AI: 您提到"25岁时参加了技术沙龙"是   │ │
│  │      转折点，能否详细描述那次沙龙的     │ │
│  │      哪些内容触动了您？                │ │
│  │                                        │ │
│  │ 👤 您: 演讲者讲述了自学编程的经历...   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  当前追问：                                 │
│  🤖 AI: 您在转型期遇到的最大困难是什么？  │
│  ┌──────────────────────────────────────┐ │
│  │ [输入您的回答]                         │ │
│  └──────────────────────────────────────┘ │
│  [提交回答] [结束追问，生成分析]            │
└────────────────────────────────────────────┘
```

**交互逻辑**:
1. AI 基于 `initial_answer` 生成首个追问
2. 用户回答后，AI 继续追问（最多 3-5 轮）
3. 用户可随时点击"结束追问，生成分析"
4. AI 调用大模型生成深度分析

---

### 流程 3: 用户认可机制

**页面**: `followup.html`（追问结束后）

```
┌────────────────────────────────────────────┐
│  AI 深度分析                                │
├────────────────────────────────────────────┤
│  基于您的回答，AI 生成了以下深度总结：      │
│  ┌──────────────────────────────────────┐ │
│  │ 【核心洞察】                            │ │
│  │ 您的职业转型并非偶然，而是长期积累的   │ │
│  │ 对机械工作不满加上对技术的好奇心...    │ │
│  │                                        │ │
│  │ 【关键特质】                            │ │
│  │ 1. 勇于跳出舒适区                      │ │
│  │ 2. 持续学习能力强                      │ │
│  │ 3. 善于从挫折中提取教训                │ │
│  │                                        │ │
│  │ 【价值观体现】                          │ │
│  │ 持续成长 > 短期高薪                    │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  您认可这个分析吗？                         │
│  [✓ 认可并存入知识库]                      │
│  [✎ 修改后存入]                            │
│  [✗ 不认可，重新分析]                      │
└────────────────────────────────────────────┘
```

**交互逻辑**:
1. **认可**：`user_approved=true`, 直接存入 `final_summary`
2. **修改**：用户可编辑 AI 分析，然后存入
3. **不认可**：AI 重新生成分析（最多 2 次）
4. 认可后，调用 `POST /api/rag/profile/approve` 更新状态

---

### 流程 4: 批量存入知识库

**触发方式**: 所有 8 个问题完成追问和认可后

```
后端任务:
FOR EACH question in user_profile:
    IF status = 'completed':
        initial = question.initial_answer
        followup = SELECT * FROM user_profile_followup
                   WHERE profile_id = question.id
                   AND user_approved = true

        content = f"""
        问题: {question.question_id}

        初始回答:
        {initial}

        深度总结:
        {followup.final_summary}
        """

        embedding = generateEmbedding(content)

        INSERT INTO knowledge_base (
            content, embedding, layer, layer_weight,
            source_type, source_id
        ) VALUES (
            content, embedding, 1, 5.0,
            'user_profile', question.id
        )
```

---

## 📊 数据库 Schema 设计

### 1. user_profile 表（第一层 - 基础问卷）

**现有表结构**：
```sql
CREATE TABLE user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding BLOB,
    importance_score REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

**优化后的表结构**：
```sql
-- 需要 ALTER TABLE 添加以下字段
ALTER TABLE user_profile ADD COLUMN initial_answer TEXT; -- 原始回答
ALTER TABLE user_profile ADD COLUMN status TEXT DEFAULT 'pending';
    -- pending: 待追问
    -- in_followup: 追问中
    -- completed: 已完成
ALTER TABLE user_profile ADD COLUMN question_text TEXT; -- 问题原文
ALTER TABLE user_profile ADD COLUMN updated_at TEXT DEFAULT (datetime('now', 'localtime'));

-- 数据迁移：将现有 answer 复制到 initial_answer
UPDATE user_profile SET initial_answer = answer WHERE initial_answer IS NULL;
```

**字段说明**：
- `question_id`: 问题标识（如 `life_chapters`, `education_career`）
- `question_text`: 问题原文（方便查看）
- `initial_answer`: 用户对基础问题的原始回答
- `answer`: 保留字段（兼容性）
- `status`: 当前处理状态
- `embedding`: 暂不使用（第二层完成后统一生成）

---

### 2. user_profile_followup 表（第二层 - 深度追问）

**新建表结构**：
```sql
CREATE TABLE IF NOT EXISTS user_profile_followup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 关联第一层
    profile_id INTEGER NOT NULL,

    -- 追问会话
    followup_round INTEGER DEFAULT 1, -- 第几轮追问
    followup_question TEXT NOT NULL,  -- AI 的追问
    user_answer TEXT NOT NULL,        -- 用户回答

    -- AI 深度分析
    ai_analysis TEXT,                 -- AI 生成的深度分析
    user_approved BOOLEAN DEFAULT 0,  -- 用户是否认可
    final_summary TEXT,               -- 用户认可后的最终总结（可能是修改后的）

    -- 元数据
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    approved_at TEXT,                 -- 认可时间

    FOREIGN KEY (profile_id) REFERENCES user_profile(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_followup_profile
    ON user_profile_followup(profile_id);
CREATE INDEX IF NOT EXISTS idx_followup_approved
    ON user_profile_followup(user_approved);
```

**字段说明**：
- `followup_round`: 追问轮次（一个问题可能有多轮追问）
- `followup_question`: AI 生成的追问
- `user_answer`: 用户对追问的回答
- `ai_analysis`: AI 基于所有追问生成的深度总结（仅在最后一轮有值）
- `user_approved`: 用户是否认可 AI 分析
- `final_summary`: 用户认可后的最终总结（可能是原 ai_analysis，也可能是用户修改后的）

---

### 3. knowledge_base 表（无需修改）

现有表结构已满足需求，只需在存入时指定：
- `layer = 1` (L1 层：核心价值与个人特质)
- `layer_weight = 5.0` (最高权重)
- `source_type = 'user_profile'`
- `source_id = user_profile.id`

---

## 🔌 API 接口设计

### 1. 提交基础问卷

**接口**: `POST /api/rag/profile/submit`

**请求体**:
```json
{
  "answers": [
    {
      "question_id": "life_chapters",
      "question_text": "如果把你的人生比作一本书...",
      "initial_answer": "第一章：探索期..."
    },
    {
      "question_id": "education_career",
      "question_text": "请描述你的教育背景和职业发展历程...",
      "initial_answer": "本科：XX大学..."
    }
    // ... 共 8 个问题
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "基础问卷已提交，准备进入深度追问阶段",
  "profile_ids": [1, 2, 3, 4, 5, 6, 7, 8]
}
```

**后端逻辑**:
```javascript
app.post('/api/rag/profile/submit', (req, res) => {
    const { answers } = req.body;
    const db = getDatabase();

    const insertStmt = db.prepare(`
        INSERT INTO user_profile
        (question_id, question_text, initial_answer, status)
        VALUES (?, ?, ?, 'pending')
    `);

    const ids = answers.map(a =>
        insertStmt.run(a.question_id, a.question_text, a.initial_answer)
            .lastInsertRowid
    );

    res.json({
        success: true,
        message: '基础问卷已提交',
        profile_ids: ids
    });
});
```

---

### 2. 获取下一个待追问的问题

**接口**: `GET /api/rag/profile/next-followup`

**响应**:
```json
{
  "has_next": true,
  "profile_id": 1,
  "question_id": "life_chapters",
  "question_text": "如果把你的人生比作一本书...",
  "initial_answer": "第一章：探索期...",
  "current_round": 1,
  "history": []
}
```

**后端逻辑**:
```javascript
app.get('/api/rag/profile/next-followup', (req, res) => {
    const db = getDatabase();

    // 查找第一个 status='pending' 或 'in_followup' 的问题
    const profile = db.prepare(`
        SELECT * FROM user_profile
        WHERE status IN ('pending', 'in_followup')
        ORDER BY id ASC LIMIT 1
    `).get();

    if (!profile) {
        return res.json({ has_next: false, message: '所有问题已完成' });
    }

    // 获取已有的追问历史
    const history = db.prepare(`
        SELECT followup_question, user_answer, followup_round
        FROM user_profile_followup
        WHERE profile_id = ?
        ORDER BY id ASC
    `).all(profile.id);

    res.json({
        has_next: true,
        profile_id: profile.id,
        question_id: profile.question_id,
        question_text: profile.question_text,
        initial_answer: profile.initial_answer,
        current_round: history.length + 1,
        history
    });
});
```

---

### 3. 生成 AI 追问

**接口**: `POST /api/rag/profile/generate-followup`

**请求体**:
```json
{
  "profile_id": 1,
  "context": {
    "question_text": "如果把你的人生比作一本书...",
    "initial_answer": "第一章：探索期...",
    "history": [
      {
        "followup_question": "您提到25岁是转折点...",
        "user_answer": "演讲者讲述了自学编程的经历..."
      }
    ]
  }
}
```

**响应**:
```json
{
  "success": true,
  "followup_question": "您在转型期遇到的最大困难是什么？",
  "should_continue": true
}
```

**后端逻辑**（调用 Ollama qwen2.5:7b）:
```javascript
const { OllamaService } = require('./services/ollama-service');

app.post('/api/rag/profile/generate-followup', async (req, res) => {
    const { profile_id, context } = req.body;
    const ollama = new OllamaService('qwen2.5:7b-instruct');

    // 构建提示词（苏格拉底提问法）
    const prompt = buildSocraticPrompt(context);

    const response = await ollama.generate(prompt);

    res.json({
        success: true,
        followup_question: response.question,
        should_continue: context.history.length < 4 // 最多5轮
    });
});
```

---

### 4. 提交追问回答

**接口**: `POST /api/rag/profile/answer-followup`

**请求体**:
```json
{
  "profile_id": 1,
  "followup_round": 2,
  "followup_question": "您在转型期遇到的最大困难是什么？",
  "user_answer": "最大的困难是..."
}
```

**响应**:
```json
{
  "success": true,
  "followup_id": 15
}
```

**后端逻辑**:
```javascript
app.post('/api/rag/profile/answer-followup', (req, res) => {
    const { profile_id, followup_round, followup_question, user_answer } = req.body;
    const db = getDatabase();

    // 更新 user_profile 状态为 in_followup
    db.prepare(`
        UPDATE user_profile
        SET status = 'in_followup'
        WHERE id = ?
    `).run(profile_id);

    // 插入追问记录
    const result = db.prepare(`
        INSERT INTO user_profile_followup
        (profile_id, followup_round, followup_question, user_answer)
        VALUES (?, ?, ?, ?)
    `).run(profile_id, followup_round, followup_question, user_answer);

    res.json({
        success: true,
        followup_id: result.lastInsertRowid
    });
});
```

---

### 5. 生成深度分析

**接口**: `POST /api/rag/profile/generate-analysis`

**请求体**:
```json
{
  "profile_id": 1
}
```

**响应**:
```json
{
  "success": true,
  "ai_analysis": "【核心洞察】您的职业转型...\n【关键特质】..."
}
```

**后端逻辑**（调用 Ollama）:
```javascript
app.post('/api/rag/profile/generate-analysis', async (req, res) => {
    const { profile_id } = req.body;
    const db = getDatabase();
    const ollama = new OllamaService('qwen2.5:7b-instruct');

    // 获取基础回答
    const profile = db.prepare('SELECT * FROM user_profile WHERE id = ?').get(profile_id);

    // 获取所有追问
    const followups = db.prepare(`
        SELECT followup_question, user_answer
        FROM user_profile_followup
        WHERE profile_id = ?
    `).all(profile_id);

    // 构建深度分析提示词
    const prompt = buildAnalysisPrompt(profile, followups);

    const analysis = await ollama.generate(prompt);

    // 存储到最后一个 followup 记录
    const lastFollowup = db.prepare(`
        SELECT id FROM user_profile_followup
        WHERE profile_id = ?
        ORDER BY id DESC LIMIT 1
    `).get(profile_id);

    db.prepare(`
        UPDATE user_profile_followup
        SET ai_analysis = ?
        WHERE id = ?
    `).run(analysis, lastFollowup.id);

    res.json({
        success: true,
        ai_analysis: analysis
    });
});
```

---

### 6. 用户认可分析

**接口**: `POST /api/rag/profile/approve-analysis`

**请求体**:
```json
{
  "profile_id": 1,
  "action": "approve",  // approve | modify | reject
  "modified_summary": null  // 如果 action=modify，这里是修改后的内容
}
```

**响应**:
```json
{
  "success": true,
  "message": "分析已认可并标记为完成"
}
```

**后端逻辑**:
```javascript
app.post('/api/rag/profile/approve-analysis', (req, res) => {
    const { profile_id, action, modified_summary } = req.body;
    const db = getDatabase();

    if (action === 'approve' || action === 'modify') {
        // 获取 AI 分析或修改后的总结
        const lastFollowup = db.prepare(`
            SELECT id, ai_analysis
            FROM user_profile_followup
            WHERE profile_id = ?
            ORDER BY id DESC LIMIT 1
        `).get(profile_id);

        const finalSummary = modified_summary || lastFollowup.ai_analysis;

        // 更新认可状态
        db.prepare(`
            UPDATE user_profile_followup
            SET user_approved = 1,
                final_summary = ?,
                approved_at = datetime('now', 'localtime')
            WHERE id = ?
        `).run(finalSummary, lastFollowup.id);

        // 更新问题状态为 completed
        db.prepare(`
            UPDATE user_profile
            SET status = 'completed',
                updated_at = datetime('now', 'localtime')
            WHERE id = ?
        `).run(profile_id);

        res.json({ success: true, message: '分析已认可并标记为完成' });
    } else if (action === 'reject') {
        // TODO: 触发重新生成分析
        res.json({ success: false, message: '重新生成功能待实现' });
    }
});
```

---

### 7. 批量存入知识库

**接口**: `POST /api/rag/profile/sync-to-knowledge-base`

**请求体**: 无

**响应**:
```json
{
  "success": true,
  "synced_count": 8,
  "details": [
    { "question_id": "life_chapters", "knowledge_base_id": 101 },
    { "question_id": "education_career", "knowledge_base_id": 102 }
    // ...
  ]
}
```

**后端逻辑**:
```javascript
const { EmbeddingService } = require('./services/embedding-service');

app.post('/api/rag/profile/sync-to-knowledge-base', async (req, res) => {
    const db = getDatabase();
    const embeddingService = new EmbeddingService();

    // 获取所有已完成的问题
    const profiles = db.prepare(`
        SELECT * FROM user_profile
        WHERE status = 'completed'
    `).all();

    const results = [];

    for (const profile of profiles) {
        // 获取认可的深度总结
        const followup = db.prepare(`
            SELECT final_summary
            FROM user_profile_followup
            WHERE profile_id = ? AND user_approved = 1
            ORDER BY id DESC LIMIT 1
        `).get(profile.id);

        if (!followup) continue;

        // 组合内容
        const content = `
问题：${profile.question_text}

初始回答：
${profile.initial_answer}

深度总结：
${followup.final_summary}
        `.trim();

        // 生成嵌入
        const embedding = await embeddingService.generate(content);
        const embeddingBlob = embeddingService.toBlob(embedding);

        // 存入 knowledge_base
        const result = db.prepare(`
            INSERT INTO knowledge_base
            (content, embedding, layer, layer_weight, source_type, source_id)
            VALUES (?, ?, 1, 5.0, 'user_profile', ?)
        `).run(content, embeddingBlob, profile.id);

        results.push({
            question_id: profile.question_id,
            knowledge_base_id: result.lastInsertRowid
        });
    }

    res.json({
        success: true,
        synced_count: results.length,
        details: results
    });
});
```

---

## 🎨 前端界面设计

### 1. questionnaire.html（基础问卷）

**Pip-Boy 主题关键元素**：
- 标题栏：`ROBCO INDUSTRIES` + 问卷标题
- 主体：双面板布局（问题区 + 输入区）
- 颜色：`#4af626` 绿色 + `#0a0a0a` 黑色背景
- 发光效果：`text-shadow: 0 0 10px var(--pip-boy-glow-mid)`
- 边框：`2px solid var(--pip-boy-border)`
- 交互反馈：hover 时发光增强

**页面结构**：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>个人历史画像问卷 - Pip-Boy</title>
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-colors.css">
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-base.css">
    <link rel="stylesheet" href="../pip-boy-theme/css/pip-boy-components.css">
    <style>
        /* 问卷特定样式 */
        .questionnaire-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }

        .question-panel {
            background: var(--pip-boy-bg);
            border: 2px solid var(--pip-boy-border);
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: inset 0 0 20px var(--pip-boy-screen-tint);
        }

        .question-header {
            font-size: 20px;
            color: var(--pip-boy-text-bright);
            text-shadow: 0 0 10px var(--pip-boy-glow-mid);
            margin-bottom: 15px;
        }

        .question-description {
            color: var(--pip-boy-text-secondary);
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .answer-textarea {
            width: 100%;
            min-height: 200px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--pip-boy-border-dim);
            color: var(--pip-boy-text-primary);
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            resize: vertical;
        }

        .answer-textarea:focus {
            outline: none;
            border-color: var(--pip-boy-border);
            box-shadow: 0 0 15px var(--pip-boy-shadow);
        }

        .button-group {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .pip-boy-button {
            background: rgba(74, 246, 38, 0.1);
            border: 2px solid var(--pip-boy-border-dim);
            color: var(--pip-boy-text-primary);
            padding: 12px 24px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .pip-boy-button:hover {
            border-color: var(--pip-boy-border);
            box-shadow: 0 0 15px var(--pip-boy-shadow);
            transform: translateY(-2px);
        }

        .progress-bar {
            margin-top: 20px;
            height: 30px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--pip-boy-border-dim);
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: var(--pip-boy-border);
            transition: width 0.3s;
            box-shadow: 0 0 10px var(--pip-boy-glow-mid);
        }
    </style>
</head>
<body class="pip-boy-body">
    <div class="pip-boy-container">
        <div class="pip-boy-header">
            <div class="pip-boy-title">ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</div>
            <div class="pip-boy-subtitle">PIP-BOY 个人历史画像问卷</div>
        </div>

        <div class="questionnaire-container">
            <div class="question-panel" id="questionPanel">
                <!-- 动态加载问题内容 -->
            </div>

            <div class="button-group">
                <button class="pip-boy-button" id="prevBtn">◀ 上一题</button>
                <button class="pip-boy-button" id="saveDraftBtn">💾 保存草稿 (Ctrl+S)</button>
                <button class="pip-boy-button" id="nextBtn">下一题 ▶</button>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 12.5%"></div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--pip-boy-text-primary);">
                    问题 <span id="currentQ">1</span>/8
                </div>
            </div>
        </div>
    </div>

    <script src="js/questionnaire.js"></script>
</body>
</html>
```

---

### 2. followup.html（深度追问）

**界面特点**：
- 对话式布局（类似聊天界面）
- AI 追问显示为机器人图标 + 绿色文本
- 用户回答显示为用户图标 + 亮绿色文本
- 实时追问历史记录
- 结束追问后显示 AI 分析审核界面

**关键 JavaScript 逻辑**（`js/followup.js`）：
```javascript
class FollowupInterface {
    constructor() {
        this.currentProfileId = null;
        this.historyContainer = document.getElementById('historyContainer');
        this.answerInput = document.getElementById('answerInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.endBtn = document.getElementById('endBtn');

        this.init();
    }

    async init() {
        // 获取下一个待追问的问题
        const response = await fetch('/api/rag/profile/next-followup');
        const data = await response.json();

        if (!data.has_next) {
            alert('所有问题已完成追问！');
            window.location.href = 'completion.html';
            return;
        }

        this.currentProfileId = data.profile_id;
        this.renderHistory(data);
        this.generateFirstFollowup(data);
    }

    renderHistory(data) {
        // 显示初始回答
        this.addMessage('user', data.initial_answer, '您的初始回答');

        // 显示追问历史
        data.history.forEach(h => {
            this.addMessage('ai', h.followup_question);
            this.addMessage('user', h.user_answer);
        });
    }

    async generateFirstFollowup(data) {
        if (data.history.length === 0) {
            // 生成第一个追问
            const response = await fetch('/api/rag/profile/generate-followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_id: this.currentProfileId,
                    context: {
                        question_text: data.question_text,
                        initial_answer: data.initial_answer,
                        history: []
                    }
                })
            });

            const followup = await response.json();
            this.addMessage('ai', followup.followup_question, '当前追问');
        }
    }

    addMessage(type, content, label = null) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;

        const icon = type === 'ai' ? '🤖 AI' : '👤 您';
        const html = `
            ${label ? `<div class="message-label">${label}:</div>` : ''}
            <div class="message-icon">${icon}:</div>
            <div class="message-content">${content}</div>
        `;

        messageEl.innerHTML = html;
        this.historyContainer.appendChild(messageEl);
        this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
    }

    async submitAnswer() {
        const answer = this.answerInput.value.trim();
        if (!answer) return;

        // 显示用户回答
        this.addMessage('user', answer);

        // 获取当前追问
        const currentQuestion = this.historyContainer.lastElementChild
            .previousElementSibling.querySelector('.message-content').textContent;

        // 提交回答
        await fetch('/api/rag/profile/answer-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: this.currentProfileId,
                followup_round: this.getCurrentRound(),
                followup_question: currentQuestion,
                user_answer: answer
            })
        });

        // 清空输入框
        this.answerInput.value = '';

        // 生成下一个追问
        await this.generateNextFollowup();
    }

    async generateNextFollowup() {
        // 获取所有历史
        const history = this.extractHistory();

        if (history.length >= 5) {
            // 达到上限，提示结束
            this.endBtn.click();
            return;
        }

        // 生成下一个追问
        const response = await fetch('/api/rag/profile/generate-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: this.currentProfileId,
                context: { history }
            })
        });

        const followup = await response.json();
        this.addMessage('ai', followup.followup_question);
    }

    async endFollowup() {
        // 生成深度分析
        const response = await fetch('/api/rag/profile/generate-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: this.currentProfileId
            })
        });

        const data = await response.json();

        // 显示认可界面
        this.showApprovalInterface(data.ai_analysis);
    }

    showApprovalInterface(analysis) {
        // 隐藏追问界面，显示认可界面
        document.getElementById('followupSection').style.display = 'none';
        document.getElementById('approvalSection').style.display = 'block';

        document.getElementById('aiAnalysisText').textContent = analysis;
    }
}

// 初始化
const followupInterface = new FollowupInterface();
```

---

## 🤖 AI 服务设计

### 1. OllamaService 类（ollama-service.js）

```javascript
const axios = require('axios');

class OllamaService {
    constructor(model = 'qwen2.5:7b-instruct', ollamaUrl = 'http://localhost:11434') {
        this.model = model;
        this.ollamaUrl = ollamaUrl;
    }

    /**
     * 生成文本（用于追问和分析）
     * @param {string} prompt - 提示词
     * @param {object} options - 可选参数
     * @returns {Promise<string>} 生成的文本
     */
    async generate(prompt, options = {}) {
        try {
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    max_tokens: options.max_tokens || 1000
                }
            });

            return response.data.response;
        } catch (error) {
            console.error('Ollama 生成失败:', error.message);
            throw error;
        }
    }

    /**
     * 构建苏格拉底追问提示词
     */
    buildSocraticPrompt(context) {
        const { question_text, initial_answer, history } = context;

        let prompt = `你是一位善于深度追问的苏格拉底式对话者。你的任务是基于用户对问题的回答，提出一个深入的追问，帮助用户更深层次地思考和表达。

原始问题：${question_text}

用户的初始回答：
${initial_answer}
`;

        if (history && history.length > 0) {
            prompt += '\n\n追问历史：\n';
            history.forEach((h, i) => {
                prompt += `第${i + 1}轮：\n`;
                prompt += `你的追问：${h.followup_question}\n`;
                prompt += `用户回答：${h.user_answer}\n\n`;
            });
        }

        prompt += `
苏格拉底提问原则：
1. 挖掘深层动机和价值观
2. 引导用户思考"为什么"而非"是什么"
3. 关注具体事例和细节
4. 避免封闭式问题，鼓励开放性表达
5. 保持中文输出，语气温和而好奇

请生成下一个追问（只输出问题，不要包含其他内容）：`;

        return prompt;
    }

    /**
     * 构建深度分析提示词
     */
    buildAnalysisPrompt(profile, followups) {
        let prompt = `你是一位专业的个人画像分析师。基于用户对问题的初始回答和后续深度追问，生成一份深度总结。

问题：${profile.question_text}

用户的初始回答：
${profile.initial_answer}

深度追问与回答：
`;

        followups.forEach((f, i) => {
            prompt += `\n第${i + 1}轮追问：${f.followup_question}\n`;
            prompt += `用户回答：${f.user_answer}\n`;
        });

        prompt += `
请生成一份深度分析总结，包含以下部分：

【核心洞察】
- 用简洁的语言概括用户在这个问题上的核心特质、价值观或经历

【关键特质】
- 列出3-5个用户展现出的关键特质（如：勇于跳出舒适区、持续学习能力强等）

【价值观体现】（如果适用）
- 分析用户的价值观倾向

【行为模式】（如果适用）
- 总结用户在面对挑战、做决策时的典型行为模式

要求：
1. 使用中文输出
2. 语言简洁有力，避免冗长
3. 基于事实，不要过度推测
4. 突出独特性，而非泛泛而谈
5. 用【】标记各个部分标题

请开始生成分析：`;

        return prompt;
    }
}

module.exports = OllamaService;
```

---

## 📝 实施步骤

### 步骤 1: 数据库优化（预计 0.5 小时）

1. 创建数据库迁移脚本 `scripts/migrate-user-profile.js`
2. 执行 ALTER TABLE 添加新字段
3. 创建 user_profile_followup 表
4. 验证数据完整性

### 步骤 2: 后端服务器搭建（预计 2 小时）

1. 创建 `server-rag.js`（独立于日志查看器的 server）
2. 实现 7 个 API 接口
3. 创建 OllamaService 类
4. 测试所有 API 端点

### 步骤 3: 前端问卷界面（预计 3 小时）

1. 创建 `questionnaire.html`
2. 实现 `js/questionnaire.js`
3. 集成 Pip-Boy 主题
4. 实现草稿自动保存
5. 测试 8 个问题的填写和提交

### 步骤 4: AI 深度追问界面（预计 3 小时）

1. 创建 `followup.html`
2. 实现 `js/followup.js`
3. 集成实时对话界面
4. 测试苏格拉底追问流程

### 步骤 5: 用户认可界面（预计 2 小时）

1. 在 `followup.html` 中添加认可界面
2. 实现修改、认可、拒绝三种操作
3. 测试用户认可流程

### 步骤 6: 知识库同步（预计 1 小时）

1. 实现批量同步 API
2. 创建管理界面（查看已同步的问题）
3. 测试端到端流程

### 步骤 7: 完整测试（预计 2 小时）

1. 完整走通 8 个问题的填写 → 追问 → 认可 → 同步流程
2. 验证数据库数据完整性
3. 测试 RAG 检索是否能正确召回个人画像
4. 优化 UI 和交互体验

---

## 🎯 预期产出

```
voice-notification-project/
├── data/
│   └── rag-database.db                 ✅ 优化后的数据库
├── viewers/
│   ├── log-viewer/                     ✅ 日志查看器（现有）
│   ├── pip-boy-theme/                  ✅ Pip-Boy主题（共享）
│   └── user-profile/                   ✅ 个人画像模块（新建）
│       ├── questionnaire.html          ✅ 基础问卷页面
│       ├── followup.html               ✅ 深度追问页面
│       ├── completion.html             ✅ 完成页面
│       └── js/
│           ├── questionnaire.js
│           ├── followup.js
│           └── profile-api.js          ✅ API 封装
├── services/
│   ├── ollama-service.js               ✅ Ollama 服务
│   ├── profile-interviewer.js          ✅ 深度访谈服务（新）
│   └── profile-sync-service.js         ✅ 知识库同步服务
├── scripts/
│   ├── migrate-user-profile.js         ✅ 数据库迁移脚本
│   └── server-rag.js                   ✅ RAG 专用服务器
└── docs/
    ├── Phase2.1-个人画像问卷完整技术方案.md  ✅ 技术方案
    └── 深度访谈提问方法最佳实践调研.md        ✅ 提问方法调研（待生成）
```

---

## 📌 关键注意事项

1. **Pip-Boy 主题一致性**：所有页面必须严格遵循 Pip-Boy 视觉风格
2. **用户认可机制**：这是核心，确保 AI 生成的内容必须经过用户审核
3. **数据不可逆性**：一旦存入 knowledge_base，应视为最终确认，避免频繁修改
4. **苏格拉底提问质量**：需要反复调试提示词，确保追问有深度
5. **关键词暂缓**：Phase 2.1 不实施关键词提取，专注核心流程
6. **模型可替换性**：代码中模型名称使用配置，方便后续更换

---

## 📅 时间估算

| 步骤 | 预计时间 | 优先级 |
|------|---------|-------|
| 数据库优化 | 0.5 小时 | P0 |
| 后端服务器搭建 | 2 小时 | P0 |
| 前端问卷界面 | 3 小时 | P0 |
| AI 深度追问界面 | 3 小时 | P0 |
| 用户认可界面 | 2 小时 | P0 |
| 知识库同步 | 1 小时 | P0 |
| 完整测试 | 2 小时 | P0 |
| **总计** | **13.5 小时** | **约 2 个工作日** |

---

**下一步**：等待壮爸确认本技术方案后，开始实施！
