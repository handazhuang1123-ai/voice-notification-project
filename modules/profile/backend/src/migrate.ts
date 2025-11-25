/**
 * Phase 2.1 数据库迁移脚本
 * 创建10张表的完整架构
 * 用于个人历史画像深度采集系统
 *
 * Author: 壮爸
 * Date: 2025-11-24
 * Version: 2.0.0 (TypeScript)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig } from './config.js';

/**
 * 获取数据库连接
 */
export function getDatabase(): Database.Database {
    const config = getConfig();
    const dbPath = config.paths.database;

    // 确保 data 目录存在
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`✅ 创建数据目录: ${dataDir}`);
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log(`📦 数据库连接成功: ${dbPath}`);

    return db;
}

/**
 * 创建10张表
 */
export function createTables(db: Database.Database): void {
    console.log('\n🔨 开始创建10张表架构...\n');

    // 1. 用户基础档案表
    console.log('📋 创建表 1/10: user_profiles（用户基础档案）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id TEXT PRIMARY KEY DEFAULT 'default_user',
            name TEXT,
            preferred_name TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            last_interview_at TEXT,
            interview_count INTEGER DEFAULT 0,
            profile_completeness REAL DEFAULT 0.0,
            metadata TEXT
        )
    `);

    // 插入默认用户
    db.prepare(`
        INSERT OR IGNORE INTO user_profiles (user_id, name)
        VALUES ('default_user', '壮爸')
    `).run();

    // 2. 访谈会话表
    console.log('📋 创建表 2/10: interview_sessions（访谈会话记录）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS interview_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            question_id TEXT NOT NULL,
            question_text TEXT NOT NULL,

            -- 时间追踪
            start_time TEXT,
            end_time TEXT,
            duration_minutes INTEGER,

            -- 访谈内容
            initial_answer TEXT NOT NULL,
            full_transcript TEXT,

            -- 五阶段完成情况
            phase_status TEXT DEFAULT 'pending',
            phases_completed TEXT,

            -- AI 分析结果
            ai_analysis TEXT,
            user_approved BOOLEAN DEFAULT 0,
            final_summary TEXT,
            approved_at TEXT,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
        )
    `);

    // 3. 核心洞察表（三层架构）
    console.log('📋 创建表 3/10: insights（核心洞察 - 三层架构）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS insights (
            insight_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            session_id TEXT NOT NULL,

            -- 洞察分类
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            evidence TEXT,

            -- 三层架构核心字段
            layer TEXT NOT NULL DEFAULT 'fact',
            confidence REAL CHECK(confidence >= 0 AND confidence <= 1),

            -- 关系追踪
            supporting_insights TEXT,

            -- 状态管理
            is_active BOOLEAN DEFAULT TRUE,
            user_approved BOOLEAN DEFAULT FALSE,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
            FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
        )
    `);

    // 4. 价值观表
    console.log('📋 创建表 4/10: user_values（价值观）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_values (
            value_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            session_id TEXT NOT NULL,

            value_name TEXT NOT NULL,
            importance_rank INTEGER,
            definition TEXT,
            origin_story TEXT,
            evidence_examples TEXT,

            -- 冲突记录
            conflicts_with TEXT,
            conflict_resolution TEXT,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
            FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
        )
    `);

    // 5. 生命转折点表
    console.log('📋 创建表 5/10: turning_points（生命转折点）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS turning_points (
            event_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            session_id TEXT NOT NULL,

            event_description TEXT NOT NULL,
            time_period TEXT,
            age_range TEXT,

            -- 转折分析
            before_state TEXT,
            after_state TEXT,
            impact_description TEXT,

            -- 关联信息
            related_values TEXT,
            related_people TEXT,

            -- 情感标记
            emotional_tone TEXT,
            significance_score REAL DEFAULT 0.5,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
            FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
        )
    `);

    // 6. 行为模式表
    console.log('📋 创建表 6/10: behavioral_patterns（行为模式）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS behavioral_patterns (
            pattern_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',

            pattern_type TEXT,
            pattern_description TEXT NOT NULL,
            trigger_context TEXT,
            typical_response TEXT,
            frequency TEXT,

            -- 证据追踪
            evidence_count INTEGER DEFAULT 1,
            evidence_sessions TEXT,

            first_observed_session TEXT,
            last_observed_session TEXT,

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
        )
    `);

    // 7. 目标表
    console.log('📋 创建表 7/10: goals（目标）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS goals (
            goal_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            session_id TEXT NOT NULL,

            goal_description TEXT NOT NULL,
            goal_type TEXT,
            time_frame TEXT,

            -- GROW 框架字段
            motivation TEXT,
            current_reality TEXT,
            obstacles TEXT,
            resources TEXT,
            options TEXT,
            action_plan TEXT,
            success_criteria TEXT,

            -- 关联信息
            related_values TEXT,

            -- 状态追踪
            status TEXT DEFAULT 'active',
            progress_notes TEXT,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
            FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
        )
    `);

    // 8. 人格特质表
    console.log('📋 创建表 8/10: personality_traits（人格特质）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS personality_traits (
            trait_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            session_id TEXT NOT NULL,

            trait_framework TEXT DEFAULT 'custom',
            trait_dimension TEXT,
            trait_score REAL,
            trait_description TEXT,
            evidence TEXT,

            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

            FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
            FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
        )
    `);

    // 9. 洞察关系表（知识图谱）
    console.log('📋 创建表 9/10: insight_relationships（洞察关系 - 知识图谱）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS insight_relationships (
            relationship_id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            strength REAL CHECK(strength >= 0 AND strength <= 1),
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    `);

    // 10. 向量嵌入表
    console.log('📋 创建表 10/10: embeddings（向量嵌入）');
    db.exec(`
        CREATE TABLE IF NOT EXISTS embeddings (
            embedding_id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            content_type TEXT NOT NULL,
            content_text TEXT NOT NULL,
            embedding_vector BLOB NOT NULL,
            embedding_model TEXT DEFAULT 'qwen3-embedding:0.6b',
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    `);

    console.log('\n✅ 10张表创建完成！');
}

/**
 * 创建索引
 */
export function createIndexes(db: Database.Database): void {
    console.log('\n🔍 创建索引...\n');

    const indexes: [string, string, string][] = [
        ['idx_sessions_user', 'interview_sessions', 'user_id'],
        ['idx_sessions_question', 'interview_sessions', 'question_id'],
        ['idx_insights_user', 'insights', 'user_id'],
        ['idx_insights_layer', 'insights', 'layer'],
        ['idx_insights_category', 'insights', 'category'],
        ['idx_insights_approved', 'insights', 'user_approved'],
        ['idx_values_user', 'user_values', 'user_id'],
        ['idx_values_rank', 'user_values', 'importance_rank'],
        ['idx_turning_points_user', 'turning_points', 'user_id'],
        ['idx_patterns_user', 'behavioral_patterns', 'user_id'],
        ['idx_patterns_type', 'behavioral_patterns', 'pattern_type'],
        ['idx_goals_user', 'goals', 'user_id'],
        ['idx_goals_status', 'goals', 'status'],
        ['idx_traits_user', 'personality_traits', 'user_id'],
        ['idx_relationships_source', 'insight_relationships', 'source_id'],
        ['idx_relationships_target', 'insight_relationships', 'target_id'],
        ['idx_embeddings_content', 'embeddings', 'content_id'],
        ['idx_embeddings_type', 'embeddings', 'content_type']
    ];

    indexes.forEach(([indexName, tableName, column]) => {
        try {
            db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${column})`);
            console.log(`✅ 创建索引: ${indexName}`);
        } catch {
            console.log(`⚠️ 索引已存在或创建失败: ${indexName}`);
        }
    });

    console.log('\n✅ 所有索引创建完成！');
}

/**
 * 验证数据库架构
 */
export function verifyDatabase(db: Database.Database): void {
    console.log('\n🔍 验证数据库架构...\n');

    const tables = [
        'user_profiles',
        'interview_sessions',
        'insights',
        'user_values',
        'turning_points',
        'behavioral_patterns',
        'goals',
        'personality_traits',
        'insight_relationships',
        'embeddings'
    ];

    tables.forEach((tableName, index) => {
        const tableInfo = db.prepare(`
            SELECT COUNT(*) as column_count
            FROM pragma_table_info(?)
        `).get(tableName) as { column_count: number };

        const recordCount = db.prepare(`
            SELECT COUNT(*) as count FROM ${tableName}
        `).get() as { count: number };

        console.log(`📊 表 ${index + 1}/10: ${tableName}`);
        console.log(`   - 列数: ${tableInfo.column_count}`);
        console.log(`   - 记录数: ${recordCount.count}`);
    });

    // 验证默认用户
    const defaultUser = db.prepare(`
        SELECT * FROM user_profiles WHERE user_id = 'default_user'
    `).get() as { name: string } | undefined;

    if (defaultUser) {
        console.log(`\n✅ 默认用户已创建: ${defaultUser.name}`);
    } else {
        console.log('\n⚠️ 默认用户未创建');
    }

    console.log('\n✅ 数据库架构验证完成！');
}

/**
 * 主函数
 */
function main(): void {
    console.log('='.repeat(50));
    console.log('Phase 2.1 数据库迁移脚本');
    console.log('10张表架构 - 个人历史画像深度采集系统');
    console.log('='.repeat(50));

    const db = getDatabase();

    try {
        // 开始事务
        db.prepare('BEGIN').run();

        // 创建表
        createTables(db);

        // 创建索引
        createIndexes(db);

        // 提交事务
        db.prepare('COMMIT').run();

        // 验证架构
        verifyDatabase(db);

        console.log('\n🎉 数据库迁移成功完成！');
        console.log('='.repeat(50));

    } catch (error) {
        // 回滚事务
        db.prepare('ROLLBACK').run();
        console.error('\n❌ 数据库迁移失败:', (error as Error).message);
        throw error;
    } finally {
        // 关闭数据库连接
        db.close();
    }
}

// 执行迁移
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main();
}
