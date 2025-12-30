/**
 * 邮件读取服务 - 通过 IMAP 读取 Gmail 回复
 */

import imaps from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';

export interface EmailReply {
    messageId: string;
    subject: string;
    from: string;
    date: Date;
    replyContent: string;  // 只提取用户新写的内容
    originalSubject: string;  // 原邮件主题（用于关联）
}

export class EmailReader {
    private config: imaps.ImapSimpleOptions;

    constructor() {
        this.config = {
            imap: {
                user: process.env.GMAIL_USER!,
                password: process.env.GMAIL_APP_PASSWORD!,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 120000,
                connTimeout: 120000
            }
        };
    }

    /**
     * 读取未处理的回复邮件
     */
    async fetchReplies(): Promise<EmailReply[]> {
        const connection = await imaps.connect(this.config);
        await connection.openBox('INBOX');

        // 搜索：主题包含 "Re: 📚 今日笔记复习" 且未读
        const searchCriteria = [
            'UNSEEN',
            ['SUBJECT', 'Re: 📚 今日笔记复习']
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: true  // 标记为已读
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const replies: EmailReply[] = [];

        for (const message of messages) {
            const all = message.parts.find(p => p.which === '');
            if (!all) continue;

            const parsed = await simpleParser(all.body);
            const replyContent = this.extractReplyContent(parsed);

            if (replyContent) {
                replies.push({
                    messageId: parsed.messageId || '',
                    subject: parsed.subject || '',
                    from: parsed.from?.text || '',
                    date: parsed.date || new Date(),
                    replyContent,
                    originalSubject: this.extractOriginalSubject(parsed.subject || '')
                });
            }
        }

        await connection.end();
        return replies;
    }

    /**
     * 提取用户新写的回复内容（过滤引用的原邮件）
     */
    private extractReplyContent(parsed: ParsedMail): string {
        let text = parsed.text || '';

        // Gmail 回复格式：用户内容在前，然后是 "On xxx wrote:" 或 "在 xxx 写道："
        const separators = [
            /\n\s*On .+ wrote:\s*\n/i,
            /\n\s*在 .+ 写道：\s*\n/,
            /\n\s*-{3,}\s*Original Message\s*-{3,}/i,
            /\n\s*-{3,}\s*原始邮件\s*-{3,}/,
            /\n\s*>{1,}/,  // 引用行
            /\n\s*From:/i,
            /\n\s*发件人:/
        ];

        for (const sep of separators) {
            const match = text.match(sep);
            if (match && match.index !== undefined) {
                text = text.substring(0, match.index);
                break;
            }
        }

        // 清理空白
        return text.trim();
    }

    /**
     * 从回复主题提取原邮件日期（用于关联问题）
     * "Re: 📚 今日笔记复习 - 2025/12/30" -> "2025/12/30"
     */
    private extractOriginalSubject(subject: string): string {
        return subject.replace(/^Re:\s*/i, '').trim();
    }
}
