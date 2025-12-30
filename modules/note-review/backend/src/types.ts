/**
 * 类型定义
 */

export interface NoteInfo {
    filename: string;
    filepath: string;
    content: string;
    modifiedTime: Date;
    links: string[];
    tags: string[];
}

export interface NoteContext {
    recentNotes: NoteInfo[];
    linkedNotes: NoteInfo[];
    allLinks: string[];
    missingLinks: string[];
}

export type QuestionType = 'concept' | 'relation' | 'application';

export interface Question {
    id?: number;
    batchId?: number;  // 所属邮件批次
    createdAt: Date;
    sourceNotes: string[];
    linkedNotes: string[];
    questionType: QuestionType;
    questionText: string;
    context: string;
    sentAt?: Date;
    answeredAt?: Date;
}

export interface EmailBatch {
    id?: number;
    batchNumber: number;  // 邮件序号，如 1, 2, 3
    createdAt: Date;
    sentAt?: Date;
    questionCount: number;
}

export interface Answer {
    id?: number;
    batchId: number;  // 关联邮件批次
    createdAt: Date;
    rawText: string;
    refinedText?: string;
    transferred: boolean;
}

export interface Config {
    obsidian: {
        notesPath: string;
        readOnly: boolean;
        recentDays: number;
    };
    review: {
        questionsPerDay: number;
        questionTypes: QuestionType[];
        scheduleTime: string;
    };
    email: {
        enabled: boolean;
        provider: string;
        from?: string;
        to: string;
    };
    ai: {
        provider: string;
        model: string;
    };
    database: {
        path: string;
    };
}
