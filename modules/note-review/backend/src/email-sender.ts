/**
 * 邮件发送服务 - Gmail SMTP
 */

import nodemailer from 'nodemailer';
import type { Question, EmailBatch } from './types.js';

const QUESTION_TYPE_LABELS: Record<string, string> = {
    concept: '📖 概念理解',
    relation: '🔗 关联启发',
    application: '💡 应用场景'
};

export class EmailSender {
    private transporter: nodemailer.Transporter;
    private from: string;

    constructor(from?: string) {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            },
            connectionTimeout: 60000,
            greetingTimeout: 60000,
            socketTimeout: 60000
        });
        this.from = from || `Note Review <${process.env.GMAIL_USER}>`;
    }

    /**
     * 发送邮件（带批次号）
     */
    async send(to: string, batch: EmailBatch, questions: Question[]): Promise<boolean> {
        const batchNum = String(batch.batchNumber).padStart(3, '0');
        const dateStr = new Date().toLocaleDateString('zh-CN');
        const subject = `📚 今日笔记复习 #${batchNum} - ${dateStr}`;
        const html = this.buildEmailHtml(batch, questions);

        try {
            await this.transporter.sendMail({
                from: this.from,
                to,
                subject,
                html
            });
            return true;
        } catch (error) {
            console.error('邮件发送失败:', error);
            return false;
        }
    }

    private buildEmailHtml(batch: EmailBatch, questions: Question[]): string {
        const batchNum = String(batch.batchNumber).padStart(3, '0');

        const questionsHtml = questions.map((q, i) => `
            <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4af626;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                    ${QUESTION_TYPE_LABELS[q.questionType] || q.questionType} · 来自《${q.sourceNotes[0]}》
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px;">
                    问题 ${i + 1}
                </div>
                <div style="font-size: 15px; color: #222; line-height: 1.6; margin-bottom: 16px;">
                    ${q.questionText}
                </div>
                <div style="font-size: 13px; color: #555; background: #fff; padding: 12px; border-radius: 4px; font-style: italic;">
                    📝 笔记摘录：${q.context}
                </div>
            </div>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 24px; color: #333; margin: 0;">📚 今日笔记复习 #${batchNum}</h1>
        <p style="color: #666; font-size: 14px;">${new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    ${questionsHtml}

    <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #2e7d32; font-size: 14px;">
            💭 直接回复此邮件记录你的想法
        </p>
    </div>

    <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
        <p>邮件编号 #${batchNum} · Note-Review 系统自动发送</p>
    </div>
</body>
</html>
        `;
    }
}
