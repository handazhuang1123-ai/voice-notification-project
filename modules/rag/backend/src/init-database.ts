/**
 * RAG Database Initialization Script
 * 数据库初始化脚本
 *
 * @author 壮爸
 * @version 2.0.0 (TypeScript)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig } from './config.js';

function initDatabase(): void {
    const config = getConfig();
    const dbPath = config.paths.database;

    // 确保 data 目录存在
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`✅ 创建数据目录: ${dataDir}`);
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    console.log('🔧 正在初始化RAG数据库...');
    console.log(`📍 数据库路径: ${dbPath}\n`);

    // ========== 表1：knowledge_base（核心知识库）==========
    console.log('📋 创建表1: knowledge_base（核心知识库）...');
    db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 6),
        layer_weight REAL NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
        retrieval_score REAL DEFAULT 0.0,
        embedding_model TEXT NOT NULL DEFAULT 'qwen3-embedding:0.6b',
        embedding_version TEXT NOT NULL DEFAULT 'v1.0',
        embedding_dimensions INTEGER NOT NULL DEFAULT 768,
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

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_layer_rating ON knowledge_base(layer, user_rating DESC);
    CREATE INDEX IF NOT EXISTS idx_created_at ON knowledge_base(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_source ON knowledge_base(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_embedding_model ON knowledge_base(embedding_model);
    CREATE INDEX IF NOT EXISTS idx_keyword ON knowledge_keywords(keyword);
    CREATE INDEX IF NOT EXISTS idx_knowledge_id ON knowledge_keywords(knowledge_id);
    `);

    console.log('✅ 索引创建完成');

    // ========== 验证数据 ==========
    console.log('\n🔍 验证数据库...');

    const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all() as { name: string }[];

    console.log(`📊 数据库包含 ${tables.length} 个表:`);
    tables.forEach(t => console.log(`   - ${t.name}`));

    // ========== 完成 ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库初始化完成！');
    console.log('='.repeat(60));
    console.log(`📍 数据库位置: ${dbPath}`);
    console.log(`📊 表结构: 6个表 + 索引`);

    db.close();
}

// 执行初始化
initDatabase();
