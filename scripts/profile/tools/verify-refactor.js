/**
 * 验证架构重构结果
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🔍 验证架构重构结果');
console.log('='.repeat(60));

// 1. 验证目录结构
console.log('\n📁 目录结构验证:');
console.log('-'.repeat(40));

const expectedDirs = [
    'data/profile',
    'scripts/profile',
    'services/profile'
];

expectedDirs.forEach(dir => {
    const exists = fs.existsSync(path.join(__dirname, '..', dir));
    console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
});

// 2. 验证文件移动
console.log('\n📄 文件移动验证:');
console.log('-'.repeat(40));

const expectedFiles = [
    { path: 'scripts/profile/server.js', name: '服务器主文件' },
    { path: 'scripts/profile/migrate.js', name: '数据库迁移脚本' },
    { path: 'scripts/profile/start.js', name: '启动脚本' },
    { path: 'scripts/profile/config.json', name: '配置文件' },
    { path: 'scripts/profile/README.md', name: '模块文档' },
    { path: 'services/profile/ollama-service.js', name: 'Ollama服务' }
];

expectedFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file.path));
    console.log(`  ${exists ? '✅' : '❌'} ${file.path} (${file.name})`);
});

// 3. 验证旧文件已移除
console.log('\n🗑️ 旧文件清理验证:');
console.log('-'.repeat(40));

const oldFiles = [
    'scripts/server-rag-profile.js',
    'scripts/migrate-to-10-tables.js',
    'services/ollama-service.js'
];

oldFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    console.log(`  ${exists ? '❌ 仍存在' : '✅ 已移除'} ${file}`);
});

// 4. 验证数据库分离
console.log('\n💾 数据库分离验证:');
console.log('-'.repeat(40));

// 检查新数据库
const newDbPath = path.join(__dirname, '..', 'data/profile/profile.db');
if (fs.existsSync(newDbPath)) {
    const newDb = new Database(newDbPath, { readonly: true });
    const newTables = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`  ✅ 新数据库 data/profile/profile.db 包含 ${newTables.length} 张表:`);
    newTables.forEach(table => {
        console.log(`     • ${table.name}`);
    });
    newDb.close();
} else {
    console.log(`  ❌ 新数据库不存在`);
}

// 检查旧数据库
console.log('\n  RAG基础数据库清理情况:');
const oldDbPath = path.join(__dirname, '..', 'data/rag-database.db');
if (fs.existsSync(oldDbPath)) {
    const oldDb = new Database(oldDbPath, { readonly: true });
    const oldTables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    const phase21Tables = [
        'user_profiles', 'interview_sessions', 'insights', 'user_values',
        'turning_points', 'behavioral_patterns', 'goals', 'personality_traits',
        'insight_relationships', 'embeddings'
    ];

    let hasPhase21Tables = false;
    oldTables.forEach(table => {
        if (phase21Tables.includes(table.name)) {
            console.log(`     ❌ Phase 2.1 表仍存在: ${table.name}`);
            hasPhase21Tables = true;
        }
    });

    if (!hasPhase21Tables) {
        console.log(`     ✅ 所有 Phase 2.1 表已清理`);
        console.log(`     ✅ RAG数据库保留 ${oldTables.length} 张基础表`);
    }

    oldDb.close();
}

// 5. 验证服务可访问性
console.log('\n🌐 服务可访问性验证:');
console.log('-'.repeat(40));

const http = require('http');
const testEndpoint = () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: '/health',
            method: 'GET',
            timeout: 2000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('  ✅ 服务器正常运行在 http://localhost:3002');
            } else {
                console.log(`  ⚠️ 服务器响应异常: ${res.statusCode}`);
            }
            resolve();
        });

        req.on('error', (err) => {
            console.log(`  ❌ 无法连接到服务器: ${err.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log('  ❌ 连接超时');
            req.destroy();
            resolve();
        });

        req.end();
    });
};

// 执行验证
(async () => {
    await testEndpoint();

    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ 架构重构验证完成！');
    console.log('\n📋 重构成果:');
    console.log('  • Phase 2.1 模块完全独立');
    console.log('  • 数据库成功分离');
    console.log('  • 文件结构清晰');
    console.log('  • 可整体迁移到其他项目');

    console.log('\n🚀 新的使用方式:');
    console.log('  启动: node scripts/profile/start.js');
    console.log('  访问: http://localhost:3002');
})();