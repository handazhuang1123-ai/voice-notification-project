const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/rag-database.db');
const db = new Database(dbPath, { readonly: true });

console.log('📊 RAG 数据库查看器');
console.log('='.repeat(80));
console.log(`📍 数据库: ${dbPath}\n`);

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'summary';

switch (command) {
    case 'summary':
        showSummary();
        break;
    case 'knowledge':
        showKnowledge(args[1]);
        break;
    case 'keywords':
        showKeywords();
        break;
    case 'tables':
        showTables();
        break;
    case 'sql':
        runSQL(args.slice(1).join(' '));
        break;
    case 'help':
        showHelp();
        break;
    default:
        console.log(`❌ 未知命令: ${command}`);
        showHelp();
}

db.close();

// ========== 功能函数 ==========

function showSummary() {
    console.log('📈 数据库概览\n');

    const tables = [
        'knowledge_base',
        'knowledge_keywords',
        'user_profile',
        'project_evolution',
        'user_feedback',
        'retrieval_stats'
    ];

    tables.forEach(table => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`  ${table.padEnd(20)} ${count.count} 条记录`);
    });

    console.log('\n📚 知识库详情:');
    const layers = db.prepare(`
        SELECT layer, COUNT(*) as count, AVG(layer_weight) as avg_weight
        FROM knowledge_base
        GROUP BY layer
        ORDER BY layer
    `).all();

    layers.forEach(l => {
        console.log(`  L${l.layer}: ${l.count} 条 (平均权重: ${l.avg_weight.toFixed(1)})`);
    });

    console.log('\n💡 提示: 使用 "node scripts/view-database.js help" 查看所有命令');
}

function showKnowledge(id) {
    console.log('📚 知识库内容\n');

    let query = `
        SELECT kb.id, kb.layer, kb.content, kb.layer_weight,
               kb.user_rating, kb.embedding_model, kb.created_at,
               GROUP_CONCAT(kw.keyword, ', ') as keywords
        FROM knowledge_base kb
        LEFT JOIN knowledge_keywords kw ON kb.id = kw.knowledge_id
    `;

    if (id) {
        query += ` WHERE kb.id = ${id}`;
    }

    query += ` GROUP BY kb.id ORDER BY kb.id`;

    const knowledge = db.prepare(query).all();

    if (knowledge.length === 0) {
        console.log('  (暂无数据)');
        return;
    }

    knowledge.forEach(k => {
        console.log('─'.repeat(80));
        console.log(`ID: ${k.id} | L${k.layer} | 权重: ${k.layer_weight} | 评分: ${k.user_rating || '未评分'}`);
        console.log(`模型: ${k.embedding_model}`);
        console.log(`创建时间: ${k.created_at}`);
        console.log(`\n内容:\n${k.content}\n`);
        console.log(`关键词: ${k.keywords || '无'}`);
    });

    console.log('='.repeat(80));
    console.log(`共 ${knowledge.length} 条记录`);
}

function showKeywords() {
    console.log('🏷️  关键词统计\n');

    const keywords = db.prepare(`
        SELECT keyword, COUNT(*) as count
        FROM knowledge_keywords
        GROUP BY keyword
        ORDER BY count DESC, keyword
    `).all();

    if (keywords.length === 0) {
        console.log('  (暂无关键词)');
        return;
    }

    keywords.forEach(k => {
        const bar = '█'.repeat(k.count);
        console.log(`  ${k.keyword.padEnd(20)} ${bar} (${k.count})`);
    });

    console.log(`\n共 ${keywords.length} 个不同的关键词`);
}

function showTables() {
    console.log('📋 数据库表结构\n');

    const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

    tables.forEach(t => {
        console.log(`\n📌 表: ${t.name}`);
        console.log('─'.repeat(80));

        const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();

        console.log('  列名'.padEnd(25) + '类型'.padEnd(15) + '非空'.padEnd(10) + '默认值');
        console.log('  ' + '─'.repeat(75));

        schema.forEach(col => {
            const name = col.name.padEnd(23);
            const type = col.type.padEnd(13);
            const notNull = (col.notnull ? '✓' : '').padEnd(8);
            const dflt = col.dflt_value || '';
            console.log(`  ${name} ${type} ${notNull} ${dflt}`);
        });

        // 显示索引
        const indexes = db.prepare(`
            PRAGMA index_list(${t.name})
        `).all();

        if (indexes.length > 0) {
            console.log('\n  索引:');
            indexes.forEach(idx => {
                console.log(`    - ${idx.name}${idx.unique ? ' (UNIQUE)' : ''}`);
            });
        }
    });
}

function runSQL(sql) {
    if (!sql) {
        console.log('❌ 请提供 SQL 语句');
        console.log('示例: node scripts/view-database.js sql "SELECT * FROM knowledge_base"');
        return;
    }

    console.log(`🔍 执行 SQL:\n${sql}\n`);

    try {
        const stmt = db.prepare(sql);
        const results = stmt.all();

        if (results.length === 0) {
            console.log('(无结果)');
            return;
        }

        // 获取列名
        const columns = Object.keys(results[0]);

        // 打印表头
        console.log(columns.join(' | '));
        console.log(columns.map(c => '─'.repeat(c.length)).join('─┼─'));

        // 打印数据
        results.forEach(row => {
            const values = columns.map(col => {
                let val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'object') return '[BLOB]';
                return String(val);
            });
            console.log(values.join(' | '));
        });

        console.log(`\n共 ${results.length} 行`);
    } catch (error) {
        console.log(`❌ SQL 错误: ${error.message}`);
    }
}

function showHelp() {
    console.log(`
📖 使用说明

命令格式:
  node scripts/view-database.js [命令] [参数]

可用命令:

  summary           显示数据库概览（默认）
  knowledge [id]    显示知识库内容（可指定 ID）
  keywords          显示关键词统计
  tables            显示所有表结构
  sql "SQL语句"     执行自定义 SQL 查询
  help              显示此帮助信息

示例:

  # 查看概览
  node scripts/view-database.js

  # 查看所有知识
  node scripts/view-database.js knowledge

  # 查看指定知识（ID=1）
  node scripts/view-database.js knowledge 1

  # 查看关键词统计
  node scripts/view-database.js keywords

  # 查看表结构
  node scripts/view-database.js tables

  # 执行自定义查询
  node scripts/view-database.js sql "SELECT * FROM knowledge_base WHERE layer = 1"
    `);
}
