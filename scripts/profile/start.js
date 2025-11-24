#!/usr/bin/env node

/**
 * Phase 2.1 个人画像系统启动脚本
 * 独立的、可迁移的模块
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 Phase 2.1 个人画像系统');
console.log('服务地址: http://localhost:3002');
console.log('按 Ctrl+C 停止服务\n');

const server = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    cwd: __dirname
});

server.on('error', (err) => {
    console.error('❌ 启动失败:', err.message);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.kill();
    process.exit(0);
});
