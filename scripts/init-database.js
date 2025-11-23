const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库路径
const dbPath = path.join(__dirname, '../data/rag-database.db');
const db = new Database(dbPath);

console.log('🔧 正在初始化RAG数据库...');
console.log(`📍 数据库路径: ${dbPath}\n`);

// 启用外键约束
db.pragma('foreign_keys = ON');

// ========== 表1：knowledge_base（核心知识库）==========
console.log('📋 创建表1: knowledge_base（核心知识库）...');
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

    -- 质量评分
    user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
    retrieval_score REAL DEFAULT 0.0,

    -- 向量元数据（为未来迁移准备）
    embedding_model TEXT NOT NULL DEFAULT 'qwen3-embedding:0.6b',
    embedding_version TEXT NOT NULL DEFAULT 'v1.0',
    embedding_dimensions INTEGER NOT NULL DEFAULT 768,

    -- 时间戳（中国本地时间）
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`);

// ========== 表2：knowledge_keywords（关键词表）==========
console.log('📋 创建表2: knowledge_keywords（关键词表）...');
db.exec(`
CREATE TABLE IF NOT EXISTS knowledge_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,

    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id) ON DELETE CASCADE
);
`);

// ========== 表3：user_profile（用户画像）==========
console.log('📋 创建表3: user_profile（用户画像）...');
db.exec(`
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding BLOB,
    importance_score REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`);

// ========== 表4：project_evolution（项目进化）==========
console.log('📋 创建表4: project_evolution（项目进化）...');
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
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`);

// ========== 表5：user_feedback（用户反馈）==========
console.log('📋 创建表5: user_feedback（用户反馈）...');
db.exec(`
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    retrieved_ids TEXT NOT NULL,
    ratings TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`);

// ========== 表6：retrieval_stats（检索统计）==========
console.log('📋 创建表6: retrieval_stats（检索统计）...');
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

// ========== 创建索引 ==========
console.log('\n📇 创建索引...');

// knowledge_base 表索引
db.exec(`
CREATE INDEX IF NOT EXISTS idx_layer_rating ON knowledge_base(layer, user_rating DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source ON knowledge_base(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_embedding_model ON knowledge_base(embedding_model);
`);

// knowledge_keywords 表索引
db.exec(`
CREATE INDEX IF NOT EXISTS idx_keyword ON knowledge_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_knowledge_id ON knowledge_keywords(knowledge_id);
`);

console.log('✅ 索引创建完成');

// ========== 插入测试数据 ==========
console.log('\n🧪 插入测试数据...');

// 创建简单的测试向量（768维全为0.1）
const testEmbedding = Buffer.from(new Float32Array(768).fill(0.1).buffer);

// 插入知识条目1
const insertKnowledge = db.prepare(`
    INSERT INTO knowledge_base (
        content, embedding, layer, layer_weight, source_type, source_id,
        embedding_model, embedding_version, embedding_dimensions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const knowledge1Id = insertKnowledge.run(
    'PowerShell编码规范：使用批准动词、PascalCase变量命名、UTF-8 BOM编码、4空格缩进',
    testEmbedding,
    1,  // L1 核心价值
    5.0,
    'test',
    'test-001',
    'qwen3-embedding:0.6b',
    'v1.0',
    768
).lastInsertRowid;

// 为知识条目1插入关键词
const insertKeyword = db.prepare(`
    INSERT INTO knowledge_keywords (knowledge_id, keyword) VALUES (?, ?)
`);

const keywords1 = ['PowerShell', '编码规范', 'PascalCase', 'UTF-8'];
for (const keyword of keywords1) {
    insertKeyword.run(knowledge1Id, keyword);
}

// 插入知识条目2
const knowledge2Id = insertKnowledge.run(
    '日志查看器项目使用Vanilla JS + Node.js技术栈，采用Pip-Boy主题，具有实时日志查看和筛选功能',
    testEmbedding,
    5,  // L5 项目上下文
    2.5,
    'test',
    'test-002',
    'qwen3-embedding:0.6b',
    'v1.0',
    768
).lastInsertRowid;

// 为知识条目2插入关键词
const keywords2 = ['日志查看器', 'JavaScript', 'Node.js', 'Pip-Boy'];
for (const keyword of keywords2) {
    insertKeyword.run(knowledge2Id, keyword);
}

// 插入知识条目3
const knowledge3Id = insertKnowledge.run(
    'RAG系统使用混合检索架构：向量检索（语义相似度）+ BM25关键词检索 + RRF融合算法',
    testEmbedding,
    3,  // L3 技术偏好
    3.5,
    'test',
    'test-003',
    'qwen3-embedding:0.6b',
    'v1.0',
    768
).lastInsertRowid;

const keywords3 = ['RAG', '混合检索', 'BM25', 'RRF'];
for (const keyword of keywords3) {
    insertKeyword.run(knowledge3Id, keyword);
}

// 插入知识条目4
const knowledge4Id = insertKnowledge.run(
    'Qwen3-Embedding:0.6b 模型生成 768 维向量，专为中文优化，适合本地部署',
    testEmbedding,
    3,  // L3 技术偏好
    3.5,
    'test',
    'test-004',
    'qwen3-embedding:0.6b',
    'v1.0',
    768
).lastInsertRowid;

const keywords4 = ['Qwen3', '嵌入模型', '中文', 'Ollama'];
for (const keyword of keywords4) {
    insertKeyword.run(knowledge4Id, keyword);
}

// 插入知识条目5
const knowledge5Id = insertKnowledge.run(
    '数据库使用 better-sqlite3 + 独立的 knowledge_keywords 表，支持高效关键词检索和JOIN操作',
    testEmbedding,
    3,  // L3 技术偏好
    3.5,
    'test',
    'test-005',
    'qwen3-embedding:0.6b',
    'v1.0',
    768
).lastInsertRowid;

const keywords5 = ['SQLite', 'better-sqlite3', '数据库', '关键词表'];
for (const keyword of keywords5) {
    insertKeyword.run(knowledge5Id, keyword);
}

const totalKeywords = keywords1.length + keywords2.length + keywords3.length + keywords4.length + keywords5.length;
console.log(`✅ 已插入 5 条知识条目`);
console.log(`✅ 已插入 ${totalKeywords} 个关键词`);

// ========== 验证数据 ==========
console.log('\n🔍 验证数据库...');

// 验证表数量
const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
`).all();
console.log(`📊 数据库包含 ${tables.length} 个表:`);
tables.forEach(t => console.log(`   - ${t.name}`));

// 验证知识条目数
const knowledgeCount = db.prepare('SELECT COUNT(*) as count FROM knowledge_base').get();
console.log(`\n📚 知识库条目数: ${knowledgeCount.count}`);

// 验证关键词数
const keywordCount = db.prepare('SELECT COUNT(*) as count FROM knowledge_keywords').get();
console.log(`🏷️  关键词总数: ${keywordCount.count}`);

// 显示知识条目详情
console.log('\n📖 知识条目详情:');
const knowledgeList = db.prepare(`
    SELECT id, layer, content, embedding_model, embedding_dimensions, created_at
    FROM knowledge_base
`).all();

knowledgeList.forEach(k => {
    const kw = db.prepare(`
        SELECT GROUP_CONCAT(keyword, ', ') as keywords
        FROM knowledge_keywords
        WHERE knowledge_id = ?
    `).get(k.id);

    console.log(`\n[ID=${k.id}] L${k.layer} | ${k.embedding_model} (${k.embedding_dimensions}维)`);
    console.log(`内容: ${k.content.substring(0, 80)}...`);
    console.log(`关键词: ${kw.keywords}`);
    console.log(`创建时间: ${k.created_at}`);
});

// ========== 完成 ==========
console.log('\n' + '='.repeat(60));
console.log('✅ 数据库初始化完成！');
console.log('='.repeat(60));
console.log(`📍 数据库位置: ${dbPath}`);
console.log(`📊 表结构: 6个表 + 索引`);
console.log(`🧪 测试数据: ${knowledgeCount.count}条知识 + ${keywordCount.count}个关键词`);
console.log('\n下一步: 运行 node tests/test-retrieval.js 测试检索功能');

db.close();
