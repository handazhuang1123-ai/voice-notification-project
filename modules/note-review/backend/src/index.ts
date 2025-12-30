/**
 * 主入口 - 启动定时任务
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { NoteReader } from './note-reader.js';
import { QuestionGenerator } from './question-generator.js';
import { ReviewDatabase } from './database.js';
import { EmailSender } from './email-sender.js';
import type { Config } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');
const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const notesPath = path.resolve(__dirname, '../..', config.obsidian.notesPath);
const dbPath = path.resolve(__dirname, '../..', config.database.path);

async function dailyReview() {
    console.log(`\n[${new Date().toLocaleString('zh-CN')}] 开始每日复习任务...`);

    try {
        // 1. 读取笔记
        const reader = new NoteReader(notesPath);
        const context = reader.getRecentNotesWithLinks(config.obsidian.recentDays);

        if (context.recentNotes.length === 0) {
            console.log('  没有近期笔记，跳过');
            return;
        }

        console.log(`  近期笔记: ${context.recentNotes.length}, 链接笔记: ${context.linkedNotes.length}`);

        // 2. 生成问题
        const generator = new QuestionGenerator(config.ai.model);
        const questions = await generator.generate(context, config.review.questionsPerDay);

        if (questions.length === 0) {
            console.log('  问题生成失败');
            return;
        }

        // 3. 保存到数据库
        const db = new ReviewDatabase(dbPath);
        for (const q of questions) {
            db.saveQuestion(q);
        }

        // 4. 发送邮件
        if (config.email.enabled && config.email.to) {
            const sender = new EmailSender(config.email.from);
            const success = await sender.send(config.email.to, questions);

            if (success) {
                const todayQuestions = db.getTodayQuestions();
                for (const q of todayQuestions) {
                    if (q.id) db.markSent(q.id);
                }
                console.log(`  ✅ 已发送 ${questions.length} 个问题到 ${config.email.to}`);
            }
        }

        db.close();
    } catch (error) {
        console.error('  ❌ 任务执行失败:', error);
    }
}

// 解析时间配置 (HH:MM)
const [hour, minute] = config.review.scheduleTime.split(':').map(Number);
const cronExpression = `${minute} ${hour} * * *`;

console.log('📚 Note-Review 服务启动');
console.log(`  笔记目录: ${notesPath}`);
console.log(`  数据库: ${dbPath}`);
console.log(`  定时任务: 每天 ${config.review.scheduleTime}`);
console.log(`  邮件: ${config.email.enabled ? config.email.to : '未启用'}`);

// 启动定时任务
cron.schedule(cronExpression, dailyReview);

console.log('\n等待定时任务执行... (Ctrl+C 退出)\n');

// 立即执行一次（可选，用于测试）
if (process.argv.includes('--now')) {
    dailyReview();
}
