/**
 * 数据库操作 - 存储问题和回答
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { Question, Answer, EmailBatch } from './types.js';

export class ReviewDatabase {
    private db: Database.Database;

    constructor(dbPath: string) {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS email_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_number INTEGER UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sent_at DATETIME,
                question_count INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                source_notes TEXT,
                linked_notes TEXT,
                question_type TEXT,
                question_text TEXT,
                context TEXT,
                sent_at DATETIME,
                answered_at DATETIME,
                FOREIGN KEY (batch_id) REFERENCES email_batches(id)
            );

            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                raw_text TEXT,
                refined_text TEXT,
                transferred INTEGER DEFAULT 0,
                FOREIGN KEY (batch_id) REFERENCES email_batches(id)
            );
        `);

        // 迁移：如果 questions 表没有 batch_id 列，添加它
        const qColumns = this.db.prepare("PRAGMA table_info(questions)").all() as Array<{ name: string }>;
        if (!qColumns.some(c => c.name === 'batch_id')) {
            this.db.exec('ALTER TABLE questions ADD COLUMN batch_id INTEGER');
        }

        // 迁移：如果 answers 表没有 batch_id 列，添加它
        const aColumns = this.db.prepare("PRAGMA table_info(answers)").all() as Array<{ name: string }>;
        if (!aColumns.some(c => c.name === 'batch_id')) {
            this.db.exec('ALTER TABLE answers ADD COLUMN batch_id INTEGER');
        }
    }

    /**
     * 创建新的邮件批次
     */
    createBatch(): EmailBatch {
        // 获取下一个批次号
        const maxRow = this.db.prepare('SELECT MAX(batch_number) as max FROM email_batches').get() as { max: number | null };
        const nextNumber = (maxRow.max || 0) + 1;

        const stmt = this.db.prepare('INSERT INTO email_batches (batch_number) VALUES (?)');
        const result = stmt.run(nextNumber);

        return {
            id: result.lastInsertRowid as number,
            batchNumber: nextNumber,
            createdAt: new Date(),
            questionCount: 0
        };
    }

    /**
     * 保存问题到指定批次
     */
    saveQuestion(question: Question, batchId?: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO questions (batch_id, source_notes, linked_notes, question_type, question_text, context)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            batchId || null,
            JSON.stringify(question.sourceNotes),
            JSON.stringify(question.linkedNotes),
            question.questionType,
            question.questionText,
            question.context
        );

        // 更新批次的问题数量
        if (batchId) {
            this.db.prepare('UPDATE email_batches SET question_count = question_count + 1 WHERE id = ?').run(batchId);
        }

        return result.lastInsertRowid as number;
    }

    /**
     * 标记批次已发送
     */
    markBatchSent(batchId: number) {
        this.db.prepare('UPDATE email_batches SET sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(batchId);
        this.db.prepare('UPDATE questions SET sent_at = CURRENT_TIMESTAMP WHERE batch_id = ?').run(batchId);
    }

    /**
     * 根据批次号获取批次
     */
    getBatchByNumber(batchNumber: number): EmailBatch | null {
        const row = this.db.prepare('SELECT * FROM email_batches WHERE batch_number = ?').get(batchNumber) as {
            id: number;
            batch_number: number;
            created_at: string;
            sent_at: string | null;
            question_count: number;
        } | undefined;

        if (!row) return null;

        return {
            id: row.id,
            batchNumber: row.batch_number,
            createdAt: new Date(row.created_at),
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            questionCount: row.question_count
        };
    }

    /**
     * 获取批次的所有问题
     */
    getQuestionsByBatch(batchId: number): Question[] {
        const rows = this.db.prepare('SELECT * FROM questions WHERE batch_id = ? ORDER BY id ASC').all(batchId) as Array<{
            id: number;
            batch_id: number;
            created_at: string;
            source_notes: string;
            linked_notes: string;
            question_type: string;
            question_text: string;
            context: string;
            sent_at: string | null;
            answered_at: string | null;
        }>;

        return rows.map(row => ({
            id: row.id,
            batchId: row.batch_id,
            createdAt: new Date(row.created_at),
            sourceNotes: JSON.parse(row.source_notes),
            linkedNotes: JSON.parse(row.linked_notes),
            questionType: row.question_type as Question['questionType'],
            questionText: row.question_text,
            context: row.context,
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            answeredAt: row.answered_at ? new Date(row.answered_at) : undefined
        }));
    }

    /**
     * 保存回复（关联到批次）
     */
    saveAnswer(answer: Omit<Answer, 'id' | 'createdAt'>): number {
        const stmt = this.db.prepare(`
            INSERT INTO answers (batch_id, raw_text, refined_text, transferred)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(
            answer.batchId,
            answer.rawText,
            answer.refinedText || null,
            answer.transferred ? 1 : 0
        );

        // 更新该批次所有问题的回答时间
        this.db.prepare('UPDATE questions SET answered_at = CURRENT_TIMESTAMP WHERE batch_id = ?')
            .run(answer.batchId);

        return result.lastInsertRowid as number;
    }

    /**
     * 获取今天未发送的问题（按批次）
     */
    getTodayUnsentBatch(): { batch: EmailBatch; questions: Question[] } | null {
        const today = new Date().toISOString().split('T')[0];
        const row = this.db.prepare(`
            SELECT * FROM email_batches
            WHERE date(created_at) = ? AND sent_at IS NULL
            ORDER BY id DESC LIMIT 1
        `).get(today) as {
            id: number;
            batch_number: number;
            created_at: string;
            sent_at: string | null;
            question_count: number;
        } | undefined;

        if (!row) return null;

        const batch: EmailBatch = {
            id: row.id,
            batchNumber: row.batch_number,
            createdAt: new Date(row.created_at),
            questionCount: row.question_count
        };

        return {
            batch,
            questions: this.getQuestionsByBatch(row.id)
        };
    }

    /**
     * 获取最近的批次列表
     */
    getRecentBatches(days: number = 7): EmailBatch[] {
        const rows = this.db.prepare(`
            SELECT * FROM email_batches
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            ORDER BY batch_number DESC
        `).all(days) as Array<{
            id: number;
            batch_number: number;
            created_at: string;
            sent_at: string | null;
            question_count: number;
        }>;

        return rows.map(row => ({
            id: row.id,
            batchNumber: row.batch_number,
            createdAt: new Date(row.created_at),
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            questionCount: row.question_count
        }));
    }

    /**
     * 获取最近的回复
     */
    getRecentAnswers(days: number = 7): (Answer & { batchNumber?: number })[] {
        const rows = this.db.prepare(`
            SELECT a.*, b.batch_number FROM answers a
            LEFT JOIN email_batches b ON a.batch_id = b.id
            WHERE a.created_at >= datetime('now', '-' || ? || ' days')
            ORDER BY a.created_at DESC
        `).all(days) as Array<{
            id: number;
            batch_id: number;
            created_at: string;
            raw_text: string;
            refined_text: string | null;
            transferred: number;
            batch_number: number | null;
        }>;

        return rows.map(row => ({
            id: row.id,
            batchId: row.batch_id,
            batchNumber: row.batch_number || undefined,
            createdAt: new Date(row.created_at),
            rawText: row.raw_text,
            refinedText: row.refined_text || undefined,
            transferred: row.transferred === 1
        }));
    }

    /**
     * 获取最近的问题（兼容旧接口）
     */
    getRecentQuestions(days: number = 7): Question[] {
        const rows = this.db.prepare(`
            SELECT * FROM questions
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            ORDER BY created_at DESC
        `).all(days) as Array<{
            id: number;
            batch_id: number | null;
            created_at: string;
            source_notes: string;
            linked_notes: string;
            question_type: string;
            question_text: string;
            context: string;
            sent_at: string | null;
            answered_at: string | null;
        }>;

        return rows.map(row => ({
            id: row.id,
            batchId: row.batch_id || undefined,
            createdAt: new Date(row.created_at),
            sourceNotes: JSON.parse(row.source_notes),
            linkedNotes: JSON.parse(row.linked_notes),
            questionType: row.question_type as Question['questionType'],
            questionText: row.question_text,
            context: row.context,
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            answeredAt: row.answered_at ? new Date(row.answered_at) : undefined
        }));
    }

    close() {
        this.db.close();
    }
}
