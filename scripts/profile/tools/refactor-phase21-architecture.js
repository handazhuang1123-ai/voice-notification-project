/**
 * Phase 2.1 架构重构脚本
 * 将混乱的结构重构为清晰、可迁移的模块架构
 *
 * 核心原则：保持扩展性和迁移灵活性
 * Author: 壮爸
 * Date: 2025-11-24
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🔧 Phase 2.1 架构重构');
console.log('='.repeat(60));

// 配置
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
    console.log('⚠️ DRY RUN 模式 - 仅显示将要执行的操作，不会实际修改文件\n');
}

// 重构步骤
const steps = [];
let currentStep = 0;

function addStep(name, action) {
    steps.push({ name, action });
}

function executeStep(step) {
    currentStep++;
    console.log(`\n[${currentStep}/${steps.length}] ${step.name}`);
    console.log('-'.repeat(40));

    if (!DRY_RUN) {
        try {
            step.action();
            console.log('✅ 完成');
        } catch (error) {
            console.error(`❌ 失败: ${error.message}`);
            throw error;
        }
    } else {
        console.log('🔍 预览操作...');
        step.action();
    }
}

// 工具函数
function ensureDir(dir) {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (DRY_RUN) {
        console.log(`  创建目录: ${dir}`);
    } else {
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`  ✅ 创建目录: ${dir}`);
        } else {
            console.log(`  ⏭️ 目录已存在: ${dir}`);
        }
    }
}

function moveFile(from, to) {
    const fromPath = path.join(PROJECT_ROOT, from);
    const toPath = path.join(PROJECT_ROOT, to);

    if (DRY_RUN) {
        if (fs.existsSync(fromPath)) {
            console.log(`  移动: ${from} → ${to}`);
        } else {
            console.log(`  ⚠️ 源文件不存在: ${from}`);
        }
    } else {
        if (fs.existsSync(fromPath)) {
            fs.renameSync(fromPath, toPath);
            console.log(`  ✅ 移动: ${from} → ${to}`);
        } else {
            console.log(`  ⚠️ 源文件不存在，跳过: ${from}`);
        }
    }
}

function updateFileContent(filePath, updates) {
    const fullPath = path.join(PROJECT_ROOT, filePath);

    if (DRY_RUN) {
        console.log(`  更新文件: ${filePath}`);
        updates.forEach(update => {
            console.log(`    • ${update.description}`);
        });
    } else {
        if (!fs.existsSync(fullPath)) {
            console.log(`  ⚠️ 文件不存在，跳过: ${filePath}`);
            return;
        }

        let content = fs.readFileSync(fullPath, 'utf-8');
        updates.forEach(update => {
            content = content.replace(update.from, update.to);
        });
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`  ✅ 更新文件: ${filePath}`);
    }
}

// ============================================================================
// 步骤1: 创建新的目录结构
// ============================================================================
addStep('创建新的目录结构', () => {
    ensureDir('data/profile');
    ensureDir('scripts/profile');
    ensureDir('services/profile');
});

// ============================================================================
// 步骤2: 迁移数据库表到独立数据库
// ============================================================================
addStep('创建独立的 profile.db 并迁移表', () => {
    const oldDbPath = path.join(PROJECT_ROOT, 'data/rag-database.db');
    const newDbPath = path.join(PROJECT_ROOT, 'data/profile/profile.db');

    if (DRY_RUN) {
        console.log(`  创建新数据库: data/profile/profile.db`);
        console.log(`  从 data/rag-database.db 迁移10张表`);
        return;
    }

    // 创建新数据库并迁移表
    const oldDb = new Database(oldDbPath);
    const newDb = new Database(newDbPath);

    // 需要迁移的表
    const tablesToMigrate = [
        'user_profiles', 'interview_sessions', 'insights', 'user_values',
        'turning_points', 'behavioral_patterns', 'goals', 'personality_traits',
        'insight_relationships', 'embeddings'
    ];

    console.log('  迁移表结构和数据...');
    tablesToMigrate.forEach(table => {
        // 获取建表语句
        const createSql = oldDb.prepare(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
        ).get(table);

        if (createSql) {
            // 创建表
            newDb.exec(createSql.sql);

            // 复制数据
            const data = oldDb.prepare(`SELECT * FROM ${table}`).all();
            if (data.length > 0) {
                const columns = Object.keys(data[0]).join(', ');
                const placeholders = Object.keys(data[0]).map(() => '?').join(', ');
                const insert = newDb.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);

                data.forEach(row => {
                    insert.run(...Object.values(row));
                });
            }

            console.log(`    ✅ 迁移表: ${table} (${data.length} 行数据)`);
        }
    });

    newDb.close();

    // 从旧数据库删除这些表
    console.log('  清理旧数据库...');
    tablesToMigrate.forEach(table => {
        oldDb.exec(`DROP TABLE IF EXISTS ${table}`);
        console.log(`    ✅ 删除旧表: ${table}`);
    });

    oldDb.close();
});

// ============================================================================
// 步骤3: 移动和重组文件
// ============================================================================
addStep('移动文件到新位置', () => {
    // 移动服务器文件
    moveFile('scripts/server-rag-profile.js', 'scripts/profile/server.js');

    // 移动迁移脚本
    moveFile('scripts/migrate-to-10-tables.js', 'scripts/profile/migrate.js');

    // 移动 Ollama 服务
    moveFile('services/ollama-service.js', 'services/profile/ollama-service.js');
});

// ============================================================================
// 步骤4: 更新文件中的引用路径
// ============================================================================
addStep('更新所有引用路径', () => {
    // 更新 server.js 中的路径
    updateFileContent('scripts/profile/server.js', [
        {
            description: '更新 ollama-service 引用',
            from: "require('../services/ollama-service')",
            to: "require('../../services/profile/ollama-service')"
        },
        {
            description: '更新 embedding-service 引用',
            from: "require('../services/embedding-service')",
            to: "require('../../services/embedding-service')"
        },
        {
            description: '更新数据库路径',
            from: "'data/rag-database.db'",
            to: "'data/profile/profile.db'"
        },
        {
            description: '更新相对路径数据库',
            from: "path.join(__dirname, '../data/rag-database.db')",
            to: "path.join(__dirname, '../../data/profile/profile.db')"
        }
    ]);

    // 更新 migrate.js 中的路径
    updateFileContent('scripts/profile/migrate.js', [
        {
            description: '更新数据库路径',
            from: "'data/rag-database.db'",
            to: "'data/profile/profile.db'"
        },
        {
            description: '更新相对路径',
            from: "path.join(__dirname, '../data/rag-database.db')",
            to: "path.join(__dirname, '../../data/profile/profile.db')"
        }
    ]);
});

// ============================================================================
// 步骤5: 创建新的启动脚本
// ============================================================================
addStep('创建启动脚本', () => {
    const startScript = `#!/usr/bin/env node

/**
 * Phase 2.1 个人画像系统启动脚本
 * 独立的、可迁移的模块
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 Phase 2.1 个人画像系统');
console.log('服务地址: http://localhost:3002');
console.log('按 Ctrl+C 停止服务\\n');

const server = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    cwd: __dirname
});

server.on('error', (err) => {
    console.error('❌ 启动失败:', err.message);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\\n正在关闭服务器...');
    server.kill();
    process.exit(0);
});
`;

    const scriptPath = path.join(PROJECT_ROOT, 'scripts/profile/start.js');

    if (DRY_RUN) {
        console.log(`  创建启动脚本: scripts/profile/start.js`);
    } else {
        fs.writeFileSync(scriptPath, startScript, 'utf-8');
        console.log(`  ✅ 创建启动脚本: scripts/profile/start.js`);
    }
});

// ============================================================================
// 步骤6: 创建配置文件
// ============================================================================
addStep('创建模块配置文件', () => {
    const config = {
        name: 'Phase 2.1 个人画像问卷系统',
        version: '1.0.0',
        description: '基于三阶段访谈框架的个人历史画像深度采集系统',
        author: '壮爸',
        port: 3002,
        database: {
            path: '../../data/profile/profile.db',
            tables: 10
        },
        dependencies: {
            'ollama-service': './ollama-service.js',
            'embedding-service': '../../embedding-service.js'
        },
        models: {
            default: 'qwen2.5:14b-instruct',
            fallback: 'qwen2.5:7b-instruct'
        },
        migration: {
            canMoveToStandalone: true,
            requiredFiles: [
                'scripts/profile/*',
                'services/profile/*',
                'viewers/user-profile/*',
                'data/profile/*'
            ]
        }
    };

    const configPath = path.join(PROJECT_ROOT, 'scripts/profile/config.json');

    if (DRY_RUN) {
        console.log(`  创建配置文件: scripts/profile/config.json`);
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`  ✅ 创建配置文件: scripts/profile/config.json`);
    }
});

// ============================================================================
// 步骤7: 创建 README 文档
// ============================================================================
addStep('创建模块文档', () => {
    const readme = `# Phase 2.1 个人画像问卷系统

## 📋 简介

独立的、可迁移的个人历史画像深度采集系统模块。

## 🚀 快速启动

\`\`\`bash
# 方式1: 使用启动脚本
node scripts/profile/start.js

# 方式2: 直接运行服务器
node scripts/profile/server.js
\`\`\`

访问: http://localhost:3002

## 📁 模块结构

\`\`\`
profile/                          # 完全独立的模块
├── scripts/profile/              # 后端脚本
│   ├── server.js                # 主服务器
│   ├── migrate.js               # 数据库迁移
│   ├── start.js                 # 启动脚本
│   └── config.json              # 配置文件
├── services/profile/            # 专用服务
│   └── ollama-service.js       # AI 服务
├── viewers/user-profile/        # 前端界面
│   ├── questionnaire.html      # 问卷
│   ├── interview.html          # 访谈
│   └── approval.html           # 认可
└── data/profile/               # 数据存储
    └── profile.db              # 独立数据库

\`\`\`

## 🔄 迁移说明

本模块设计为**完全独立**，可以轻松迁移到其他项目：

1. 复制以上4个目录到目标项目
2. 安装依赖: \`npm install express cors better-sqlite3 axios\`
3. 运行: \`node scripts/profile/start.js\`

## 🛠️ 技术特性

- **三阶段访谈框架**: 叙事探索 + GROW + 价值澄清
- **DICE 追问技术**: 智能对话引导
- **三层数据分离**: 事实层、解释层、洞察层
- **独立数据库**: 10张专用表，数据隔离
- **Ollama LLM**: 支持模型切换

## 👤 作者

壮爸 - 2025-11-24
`;

    const readmePath = path.join(PROJECT_ROOT, 'scripts/profile/README.md');

    if (DRY_RUN) {
        console.log(`  创建文档: scripts/profile/README.md`);
    } else {
        fs.writeFileSync(readmePath, readme, 'utf-8');
        console.log(`  ✅ 创建文档: scripts/profile/README.md`);
    }
});

// ============================================================================
// 执行重构
// ============================================================================
console.log(`\n准备执行 ${steps.length} 个重构步骤...\n`);

try {
    steps.forEach(executeStep);

    console.log('\n' + '='.repeat(60));
    if (DRY_RUN) {
        console.log('🔍 预览完成！使用以下命令执行实际重构:');
        console.log('   node scripts/refactor-phase21-architecture.js');
    } else {
        console.log('✅ 架构重构完成！');
        console.log('\n新的启动方式:');
        console.log('  node scripts/profile/start.js');
        console.log('\n或者:');
        console.log('  node scripts/profile/server.js');
    }
} catch (error) {
    console.error('\n❌ 重构失败:', error.message);
    process.exit(1);
}