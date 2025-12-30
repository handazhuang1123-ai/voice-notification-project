/**
 * CLI 工具 - 手动生成和发送问题
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { NoteReader } from './note-reader.js';
import { QuestionGenerator } from './question-generator.js';
import { ReviewDatabase } from './database.js';
import { EmailSender } from './email-sender.js';
import { EmailReader } from './email-reader.js';
import type { Config } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');
const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const notesPath = path.resolve(__dirname, '../..', config.obsidian.notesPath);
const dbPath = path.resolve(__dirname, '../..', config.database.path);

async function generate() {
    console.log('📖 读取近期笔记...');
    const reader = new NoteReader(notesPath);
    const context = reader.getRecentNotesWithLinks(config.obsidian.recentDays);

    console.log(`  - 近期笔记: ${context.recentNotes.length} 篇`);
    console.log(`  - 链接笔记: ${context.linkedNotes.length} 篇`);
    console.log(`  - 未创建链接: ${context.missingLinks.length} 个`);

    if (context.recentNotes.length === 0) {
        console.log('⚠️  没有找到近期笔记，跳过生成');
        return;
    }

    const db = new ReviewDatabase(dbPath);

    // 获取历史问题，避免重复
    const recentQuestions = db.getRecentQuestions(30);
    const previousQuestions = recentQuestions.map(q => q.questionText);

    console.log('\n🤖 生成问题...');
    console.log(`  - 已有 ${previousQuestions.length} 个历史问题，将避开重复`);

    const generator = new QuestionGenerator(config.ai.model);
    const questions = await generator.generate(context, config.review.questionsPerDay, previousQuestions);

    if (questions.length === 0) {
        console.log('⚠️  问题生成失败');
        db.close();
        return;
    }

    // 创建新批次
    const batch = db.createBatch();
    console.log(`  - 创建邮件批次 #${String(batch.batchNumber).padStart(3, '0')}`);
    console.log(`  - 生成了 ${questions.length} 个问题`);

    for (const q of questions) {
        const id = db.saveQuestion(q, batch.id);
        console.log(`  - 保存问题 #${id}: ${q.questionType}`);
    }

    db.close();
    console.log('\n✅ 问题生成完成！使用 pnpm send 发送邮件');
}

async function send() {
    const db = new ReviewDatabase(dbPath);
    const result = db.getTodayUnsentBatch();

    if (!result) {
        console.log('⚠️  今天没有待发送的批次，先运行 pnpm generate');
        db.close();
        return;
    }

    const { batch, questions } = result;

    if (questions.length === 0) {
        console.log('⚠️  批次中没有问题');
        db.close();
        return;
    }

    if (!config.email.enabled) {
        console.log('⚠️  邮件功能未启用');
        db.close();
        return;
    }

    if (!config.email.to) {
        console.log('⚠️  请在 config.json 中配置收件人邮箱');
        db.close();
        return;
    }

    const batchNum = String(batch.batchNumber).padStart(3, '0');
    console.log(`📧 发送邮件 #${batchNum} (${questions.length} 个问题) 到 ${config.email.to}...`);

    const sender = new EmailSender(config.email.from);
    const success = await sender.send(config.email.to, batch, questions);

    if (success) {
        db.markBatchSent(batch.id!);
        console.log('✅ 邮件发送成功！');
    } else {
        console.log('❌ 邮件发送失败');
    }

    db.close();
}

function list() {
    const db = new ReviewDatabase(dbPath);
    const batches = db.getRecentBatches(7);

    if (batches.length === 0) {
        console.log('📭 最近 7 天没有邮件批次');
        db.close();
        return;
    }

    console.log(`📋 最近 7 天的邮件批次 (${batches.length} 个):\n`);

    for (const b of batches) {
        const status = b.sentAt ? '📧' : '⏳';
        const date = b.createdAt.toLocaleDateString('zh-CN');
        const batchNum = String(b.batchNumber).padStart(3, '0');
        console.log(`${status} [${date}] 邮件 #${batchNum} - ${b.questionCount} 个问题`);

        // 显示该批次的问题
        const questions = db.getQuestionsByBatch(b.id!);
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const answered = q.answeredAt ? '✅' : '  ';
            console.log(`   ${answered} 问题 ${i + 1}: ${q.questionText.slice(0, 50)}...`);
        }
        console.log('');
    }

    db.close();
}

async function checkReplies() {
    console.log('📬 检查邮件回复...');

    const reader = new EmailReader();
    const replies = await reader.fetchReplies();

    if (replies.length === 0) {
        console.log('  没有新的回复');
        return;
    }

    console.log(`  找到 ${replies.length} 封回复邮件\n`);

    const db = new ReviewDatabase(dbPath);

    for (const reply of replies) {
        console.log(`📩 处理回复: ${reply.subject}`);
        console.log(`   日期: ${reply.date.toLocaleString('zh-CN')}`);

        // 从主题提取批次号
        // 主题格式: "Re: 📚 今日笔记复习 #001 - 2025/12/30"
        const batchMatch = reply.originalSubject.match(/#(\d+)/);
        if (!batchMatch) {
            console.log('   ⚠️ 无法从主题提取邮件编号，跳过');
            continue;
        }

        const batchNumber = parseInt(batchMatch[1]);
        const batch = db.getBatchByNumber(batchNumber);

        if (!batch) {
            console.log(`   ⚠️ 找不到邮件 #${batchNumber}，跳过`);
            continue;
        }

        // 保存回复（关联到批次）
        const answerId = db.saveAnswer({
            batchId: batch.id!,
            rawText: reply.replyContent,
            transferred: false
        });

        console.log(`   ✅ 保存回答 #${answerId} → 邮件 #${String(batchNumber).padStart(3, '0')}`);
    }

    db.close();
    console.log('\n✅ 回复处理完成');
}

function listAnswers() {
    const db = new ReviewDatabase(dbPath);
    const answers = db.getRecentAnswers(7);

    if (answers.length === 0) {
        console.log('📭 最近 7 天没有回复');
        db.close();
        return;
    }

    console.log(`📝 最近 7 天的回复 (${answers.length} 条):\n`);

    for (const a of answers) {
        const date = a.createdAt.toLocaleDateString('zh-CN');
        const batchNum = a.batchNumber ? `#${String(a.batchNumber).padStart(3, '0')}` : '未知';
        console.log(`[${date}] 回答 #${a.id} → 邮件 ${batchNum}`);
        console.log(`   ${a.rawText.slice(0, 100)}${a.rawText.length > 100 ? '...' : ''}\n`);
    }

    db.close();
}

// 主入口
const command = process.argv[2];

switch (command) {
    case 'generate':
        generate().catch(console.error);
        break;
    case 'send':
        send().catch(console.error);
        break;
    case 'list':
        list();
        break;
    case 'check-replies':
        checkReplies().catch(console.error);
        break;
    case 'answers':
        listAnswers();
        break;
    default:
        console.log(`
Note-Review CLI

用法:
  pnpm generate       - 生成今日问题（创建新邮件批次）
  pnpm send           - 发送今日邮件
  pnpm list           - 查看最近邮件和问题
  pnpm check-replies  - 检查并保存邮件回复
  pnpm answers        - 查看最近回复
        `);
}
