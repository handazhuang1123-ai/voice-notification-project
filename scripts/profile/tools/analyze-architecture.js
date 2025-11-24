/**
 * 架构分析脚本 - 分析Phase 2.1的依赖关系
 * 用于重构前的全面分析
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 2.1 架构分析报告');
console.log('='.repeat(60));

// 1. 分析数据库结构
console.log('\n📊 数据库架构分析:');
console.log('-'.repeat(40));

const ragDb = new Database('data/rag-database.db', { readonly: true });
const tables = ragDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('RAG数据库中的所有表:');
const phase21Tables = [
    'user_profiles', 'interview_sessions', 'insights', 'user_values',
    'turning_points', 'behavioral_patterns', 'goals', 'personality_traits',
    'insight_relationships', 'embeddings'
];

tables.forEach(table => {
    const isPhase21 = phase21Tables.includes(table.name);
    console.log(`  ${isPhase21 ? '🔴' : '⚪'} ${table.name} ${isPhase21 ? '(Phase 2.1)' : ''}`);
});

ragDb.close();

// 2. 分析文件结构和依赖
console.log('\n📁 文件结构和依赖关系:');
console.log('-'.repeat(40));

const dependencies = {
    'scripts/server-rag-profile.js': {
        imports: [
            '../services/ollama-service.js',
            '../services/embedding-service.js',
            'data/rag-database.db'
        ],
        usedBy: []
    },
    'viewers/user-profile/js/questionnaire.js': {
        imports: [],
        usedBy: [],
        apiEndpoint: 'http://localhost:3002/api/rag/profile'
    },
    'viewers/user-profile/js/interview.js': {
        imports: [],
        usedBy: [],
        apiEndpoint: 'http://localhost:3002/api/rag/profile'
    },
    'viewers/user-profile/js/approval.js': {
        imports: [],
        usedBy: [],
        apiEndpoint: 'http://localhost:3002/api/rag/profile'
    },
    'services/ollama-service.js': {
        imports: [],
        usedBy: ['scripts/server-rag-profile.js']
    },
    'scripts/migrate-to-10-tables.js': {
        imports: ['data/rag-database.db'],
        usedBy: []
    }
};

console.log('当前依赖关系图:');
Object.entries(dependencies).forEach(([file, deps]) => {
    console.log(`\n  📄 ${file}`);
    if (deps.imports && deps.imports.length > 0) {
        console.log(`     ├─ 导入: ${deps.imports.join(', ')}`);
    }
    if (deps.usedBy && deps.usedBy.length > 0) {
        console.log(`     ├─ 被引用: ${deps.usedBy.join(', ')}`);
    }
    if (deps.apiEndpoint) {
        console.log(`     └─ API: ${deps.apiEndpoint}`);
    }
});

// 3. 识别架构问题
console.log('\n⚠️ 识别的架构问题:');
console.log('-'.repeat(40));

const problems = [
    {
        severity: '严重',
        issue: '数据库表混放',
        description: 'Phase 2.1的10张表与RAG基础表混在同一数据库中',
        impact: '迁移困难，数据隔离性差'
    },
    {
        severity: '严重',
        issue: 'Scripts文件夹混乱',
        description: 'server-rag-profile.js直接放在scripts根目录',
        impact: '难以识别模块归属，维护困难'
    },
    {
        severity: '中等',
        issue: '服务层不清晰',
        description: 'ollama-service.js在services目录但专属于Phase 2.1',
        impact: '服务复用性差，边界不清'
    },
    {
        severity: '低',
        issue: '硬编码路径',
        description: '多处使用相对路径引用，缺少配置文件',
        impact: '重构时需要修改多处'
    }
];

problems.forEach(problem => {
    console.log(`\n  ${problem.severity === '严重' ? '🔴' : problem.severity === '中等' ? '🟡' : '🟢'} [${problem.severity}] ${problem.issue}`);
    console.log(`     问题: ${problem.description}`);
    console.log(`     影响: ${problem.impact}`);
});

// 4. 建议的目标架构
console.log('\n✅ 建议的目标架构:');
console.log('-'.repeat(40));

const targetStructure = `
voice-notification-project/
├── data/
│   ├── memory.db              # 原有语音通知数据库
│   ├── rag-database.db        # RAG基础设施数据库
│   └── profile/               # 🆕 Phase 2.1专用目录
│       └── profile.db         # 🆕 个人画像独立数据库
│
├── scripts/
│   ├── profile/               # 🆕 Phase 2.1专用目录
│   │   ├── server.js          # 移动自 server-rag-profile.js
│   │   └── migrate.js         # 移动自 migrate-to-10-tables.js
│   └── viewers/               # 原有查看器脚本
│
├── services/
│   ├── profile/               # 🆕 Phase 2.1专用服务
│   │   └── ollama-service.js # 移动自 services/ollama-service.js
│   └── embedding-service.js  # 保持不变（通用服务）
│
└── viewers/
    ├── log-viewer/            # 原有日志查看器
    └── user-profile/          # Phase 2.1前端（已正确组织）
`;

console.log(targetStructure);

// 5. 迁移影响分析
console.log('\n🔄 迁移影响分析:');
console.log('-'.repeat(40));

const migrationImpacts = [
    {
        file: 'scripts/server-rag-profile.js → scripts/profile/server.js',
        changes: [
            "修改 require('../services/ollama-service.js') → require('../../services/profile/ollama-service.js')",
            "修改数据库路径 'data/rag-database.db' → 'data/profile/profile.db'",
            "更新 embedding-service.js 的引用路径"
        ]
    },
    {
        file: 'services/ollama-service.js → services/profile/ollama-service.js',
        changes: ['无需修改，只是移动位置']
    },
    {
        file: '前端文件 (viewers/user-profile/js/*.js)',
        changes: ['无需修改，API端点保持不变']
    },
    {
        file: '启动命令',
        changes: ['node scripts/server-rag-profile.js → node scripts/profile/server.js']
    }
];

migrationImpacts.forEach(impact => {
    console.log(`\n  📄 ${impact.file}`);
    impact.changes.forEach(change => {
        console.log(`     • ${change}`);
    });
});

console.log('\n' + '='.repeat(60));
console.log('分析完成！建议按照目标架构进行重构。');