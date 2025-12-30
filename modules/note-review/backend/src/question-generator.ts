/**
 * AI 问题生成器 - 基于笔记内容生成启发性问题
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NoteContext, Question, QuestionType } from './types.js';

const QUESTION_PROMPT = `你是一个读书笔记复习助手。根据用户的笔记内容，生成启发性问题帮助用户深度思考和形成自己的观点。

## 问题类型

1. **concept（概念理解）**：让用户用自己的话解释某个概念
2. **relation（关联启发）**：探索两个或多个概念之间的联系
3. **application（应用场景）**：将概念应用到实际生活/工作中

## 要求

- 问题要有启发性，不是简单的记忆题
- 引用笔记中的原文作为上下文
- 鼓励用户形成自己的观点，而非复述原文
- 问题要具体，避免过于宽泛
- **重要：每次生成的问题必须不同，随机选择笔记中的不同概念和段落**
- **重要：优先选择之前没有问过的内容**

## 输出格式

返回 JSON 数组，每个问题包含：
- type: 问题类型 (concept/relation/application)
- question: 问题内容
- context: 相关的笔记摘录（用于邮件展示）
- sourceNote: 主要来源笔记名称

示例：
[
  {
    "type": "concept",
    "question": "万维钢提到'逻辑斯蒂增长会很快陷入边际效益递减'。你能用自己的话解释什么是逻辑斯蒂增长吗？它和指数增长的本质区别是什么？",
    "context": "指数增长会一直高速增长下去，而逻辑斯蒂增长会很快陷入边际效益递减，最终收敛在一个上限之下，形成所谓的 s 曲线。",
    "sourceNote": "第二章 洞见AI"
  }
]`;

export class QuestionGenerator {
    private client: Anthropic;
    private model: string;

    constructor(model: string = 'claude-sonnet-4-20250514') {
        this.client = new Anthropic();
        this.model = model;
    }

    async generate(context: NoteContext, count: number = 2, previousQuestions: string[] = []): Promise<Question[]> {
        const notesContent = this.buildNotesContent(context);
        const randomSeed = Date.now(); // 用时间戳增加随机性

        const previousSection = previousQuestions.length > 0
            ? `\n### 已经问过的问题（请避开这些内容，选择其他概念）\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
            : '';

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: `${QUESTION_PROMPT}

## 用户笔记内容

### 近期笔记
${notesContent.recent}

### 链接笔记
${notesContent.linked}

### 未创建的链接（种子概念）
${context.missingLinks.join(', ') || '无'}
${previousSection}
请生成 ${count} 个不同类型的启发性问题。随机种子: ${randomSeed}。返回纯 JSON 数组，不要其他内容。`
                }
            ]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const questions = this.parseResponse(text, context);

        return questions;
    }

    private buildNotesContent(context: NoteContext): { recent: string; linked: string } {
        const formatNote = (note: { filename: string; content: string; tags: string[] }) => {
            const tags = note.tags.length > 0 ? `[标签: ${note.tags.join(', ')}]` : '';
            return `#### ${note.filename} ${tags}\n${note.content.slice(0, 2000)}${note.content.length > 2000 ? '...' : ''}`;
        };

        return {
            recent: context.recentNotes.map(formatNote).join('\n\n---\n\n'),
            linked: context.linkedNotes.map(formatNote).join('\n\n---\n\n') || '无链接笔记'
        };
    }

    private parseResponse(text: string, context: NoteContext): Question[] {
        try {
            // 提取 JSON 数组
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('未找到 JSON 数组');
            }

            // 清理 JSON 字符串
            let jsonStr = jsonMatch[0];

            // 修复代理服务导致的重复 key: "type": "type": "xxx" -> "type": "xxx"
            jsonStr = jsonStr.replace(/"type":\s*"type":\s*/g, '"type": ');
            // 修复 AI 格式错误: { "concept", -> { "type": "concept",（只在没有 "type": 时）
            jsonStr = jsonStr.replace(/\{\s*\n\s*"(concept|relation|application)",/g, '{\n    "type": "$1",');
            // 移除零宽字符和其他不可见字符
            jsonStr = jsonStr.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
            // 规范化引号（中文引号转英文）
            jsonStr = jsonStr.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
            jsonStr = jsonStr.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

            const parsed = JSON.parse(jsonStr) as Array<{
                type: QuestionType;
                question: string;
                context: string;
                sourceNote: string;
            }>;

            return parsed.map(q => ({
                createdAt: new Date(),
                sourceNotes: [q.sourceNote],
                linkedNotes: context.linkedNotes.map(n => n.filename),
                questionType: q.type,
                questionText: q.question,
                context: q.context
            }));
        } catch (error) {
            console.error('解析 AI 响应失败:', error);
            console.error('原始响应:', text);
            return [];
        }
    }
}
