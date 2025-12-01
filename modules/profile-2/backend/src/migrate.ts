/**
 * Profile-2 数据库迁移脚本
 * 创建8张表结构
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库路径
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = join(DATA_DIR, 'profile-v2.db');

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory:', DATA_DIR);
}

// 创建数据库连接
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('🗄️  Starting Profile-2 database migration...');
console.log('📍 Database path:', DB_PATH);

// ============ 表1: users ============
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME
  );
`);
console.log('✅ Table created: users');

// ============ 表2: sessions ============
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- 问题信息
    question_id TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    initial_answer TEXT,

    -- 阶段管理
    current_phase TEXT DEFAULT 'opening',
    phase_config TEXT NOT NULL,

    -- 状态
    status TEXT DEFAULT 'in_progress',

    -- 版本管理（数据覆盖保护）
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    archived_at DATETIME,
    archived_reason TEXT,
    previous_session_id TEXT,

    -- 统计
    total_turns INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- 最终总结
    final_summary TEXT,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_question ON sessions(question_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, question_id, is_active);
`);
console.log('✅ Table created: sessions');

// ============ 表3: turns ============
db.exec(`
  CREATE TABLE IF NOT EXISTS turns (
    turn_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,

    -- 对话内容
    turn_number INTEGER NOT NULL,
    phase TEXT NOT NULL,

    user_message TEXT NOT NULL,
    ai_message TEXT NOT NULL,

    -- AI决策记录
    probe_type TEXT,
    ai_reasoning TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
`);
console.log('✅ Table created: turns');

// ============ 表4: values ============
db.exec(`
  CREATE TABLE IF NOT EXISTS "values" (
    value_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,

    -- 价值观内容
    domain TEXT NOT NULL,
    value_name TEXT NOT NULL,

    -- 深度层级
    depth_layer INTEGER NOT NULL DEFAULT 1,

    -- 证据
    evidence_quote TEXT,
    evidence_turn_id INTEGER,

    -- 验证状态
    user_confirmed BOOLEAN,
    importance_rank INTEGER,

    -- RAG同步
    rag_synced BOOLEAN DEFAULT FALSE,
    rag_embedding_id TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_values_user ON "values"(user_id);
  CREATE INDEX IF NOT EXISTS idx_values_domain ON "values"(domain);
  CREATE INDEX IF NOT EXISTS idx_values_confirmed ON "values"(user_confirmed);
  CREATE INDEX IF NOT EXISTS idx_values_rag ON "values"(rag_synced);
`);
console.log('✅ Table created: values');

// ============ 表5: insights ============
db.exec(`
  CREATE TABLE IF NOT EXISTS insights (
    insight_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,

    -- 洞察内容
    insight_type TEXT NOT NULL,
    content TEXT NOT NULL,

    -- 来源
    source_phase TEXT,
    source_turn_id INTEGER,
    trigger_quote TEXT,

    -- 关联
    related_value_id INTEGER,
    related_goal_id INTEGER,

    -- 审批状态
    status TEXT DEFAULT 'pending',
    approved_content TEXT,

    -- RAG同步
    rag_synced BOOLEAN DEFAULT FALSE,
    rag_embedding_id TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id);
  CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(insight_type);
  CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);
  CREATE INDEX IF NOT EXISTS idx_insights_rag ON insights(rag_synced);
`);
console.log('✅ Table created: insights');

// ============ 表6: goals ============
db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,

    -- GROW - Goal
    goal_description TEXT NOT NULL,
    goal_type TEXT,
    smart_specific TEXT,
    smart_measurable TEXT,
    smart_achievable TEXT,
    smart_relevant TEXT,
    smart_time_bound TEXT,
    importance_score INTEGER,

    -- GROW - Reality
    current_state TEXT,
    obstacles TEXT,
    reality_aha_moment TEXT,

    -- GROW - Options
    options_generated TEXT,
    option_selected TEXT,
    selection_reason TEXT,

    -- GROW - Way Forward
    action_steps TEXT,
    first_step TEXT,
    commitment_level INTEGER,

    -- 状态追踪
    status TEXT DEFAULT 'active',
    progress_notes TEXT,

    -- RAG同步
    rag_synced BOOLEAN DEFAULT FALSE,
    rag_embedding_id TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
  CREATE INDEX IF NOT EXISTS idx_goals_rag ON goals(rag_synced);
`);
console.log('✅ Table created: goals');

// ============ 表7: rag_sync_queue ============
db.exec(`
  CREATE TABLE IF NOT EXISTS rag_sync_queue (
    queue_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 来源
    source_table TEXT NOT NULL,
    source_id INTEGER NOT NULL,

    -- 内容
    content_text TEXT NOT NULL,
    content_type TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- 元数据
    metadata TEXT NOT NULL,

    -- 同步状态
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,

    -- RAG模块返回
    embedding_id TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_rag_queue_status ON rag_sync_queue(status);
  CREATE INDEX IF NOT EXISTS idx_rag_queue_source ON rag_sync_queue(source_table, source_id);
`);
console.log('✅ Table created: rag_sync_queue');

// ============ 表8: phase_transitions ============
db.exec(`
  CREATE TABLE IF NOT EXISTS phase_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,

    from_phase TEXT,
    to_phase TEXT NOT NULL,

    -- AI决策记录
    transition_reasons TEXT,
    evaluation_data TEXT,

    turn_number INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_transitions_session ON phase_transitions(session_id);
`);
console.log('✅ Table created: phase_transitions');

// 关闭数据库连接
db.close();

console.log('');
console.log('========================================');
console.log('  ✅ Migration completed successfully!');
console.log('  📊 8 tables created');
console.log('  📍 Database:', DB_PATH);
console.log('========================================');
