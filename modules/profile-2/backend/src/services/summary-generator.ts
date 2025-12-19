/**
 * Profile-2 独立总结生成器
 * 与对话生成分离，专门处理 Summary 阶段
 */

import { ollamaService } from './ollama-service.js';
import { contextManager } from './context-manager.js';
import { db } from './database.js';
import { logger } from './logger.js';
import { getQuestionStrategy } from '../config.js';
import { SUMMARY_PROMPT, ENHANCED_SUMMARY_PROMPT } from '../prompts/summary-prompts.js';
import {
    SummarySchema,
    EnhancedSummarySchema,
    type SummaryResponse,
    type EnhancedSummaryResponse
} from '../schemas/index.js';

/** 总结生成结果 */
export interface SummaryResult {
    summary: string;
    keyInsights: string[];
    valuesDiscovered: Array<{
        domain: string;
        value: string;
        evidence: string;
    }>;
    actionItems: string[];
    isEnhanced: boolean;
}

class SummaryGenerator {
    /**
     * 生成会话总结（不入库，返回预览）
     */
    async generate(sessionId: string): Promise<SummaryResult> {
        const startTime = Date.now();

        // 获取完整上下文
        const context = contextManager.buildContext(sessionId);
        const { session, turns, values, insights, goals, strategy } = context;

        if (!strategy) {
            throw new Error(`No strategy found for question: ${session.question_id}`);
        }

        const isEnhanced = strategy.summaryEnhanced ?? false;

        // 构建上下文文本
        const contextText = this.buildContextText(context);

        // 选择提示词和 Schema
        const prompt = isEnhanced ? ENHANCED_SUMMARY_PROMPT : SUMMARY_PROMPT;
        const fullPrompt = prompt + '\n\n' + contextText;

        logger.info('summary', 'Generating summary', {
            session_id: sessionId,
            data: {
                isEnhanced,
                turnCount: turns.length,
                valueCount: values.length
            }
        });

        try {
            if (isEnhanced) {
                const structured = await ollamaService.generateStructured<EnhancedSummaryResponse>(
                    fullPrompt,
                    [],
                    EnhancedSummarySchema,
                    sessionId
                );

                const result: SummaryResult = {
                    summary: structured.final_message
                        ? `${structured.integrated_summary}\n\n${structured.final_message}`
                        : structured.integrated_summary,
                    keyInsights: [
                        structured.timeline_insights,
                        structured.life_philosophy,
                        ...structured.cross_domain_patterns
                    ].filter(Boolean),
                    valuesDiscovered: structured.core_traits.map(trait => ({
                        domain: '核心特质',
                        value: trait,
                        evidence: ''
                    })),
                    actionItems: [],
                    isEnhanced: true
                };

                const duration = Date.now() - startTime;
                logger.info('summary', 'Enhanced summary generated', {
                    session_id: sessionId,
                    duration_ms: duration,
                    data: { summaryLength: result.summary.length }
                });

                return result;
            } else {
                const structured = await ollamaService.generateStructured<SummaryResponse>(
                    fullPrompt,
                    [],
                    SummarySchema,
                    sessionId
                );

                const result: SummaryResult = {
                    summary: structured.closing_message
                        ? `${structured.summary}\n\n${structured.closing_message}`
                        : structured.summary,
                    keyInsights: structured.key_insights,
                    valuesDiscovered: structured.values_discovered,
                    actionItems: structured.action_items,
                    isEnhanced: false
                };

                const duration = Date.now() - startTime;
                logger.info('summary', 'Summary generated', {
                    session_id: sessionId,
                    duration_ms: duration,
                    data: { summaryLength: result.summary.length }
                });

                return result;
            }
        } catch (error) {
            logger.error('summary', 'Summary generation failed', {
                session_id: sessionId,
                data: { error: String(error) }
            });

            // 降级：生成简单文本总结
            return this.fallbackGenerate(sessionId, context);
        }
    }

    /**
     * 保存总结到 pending_approval 状态
     */
    savePending(sessionId: string, summary: string): void {
        db.completeSession(sessionId, summary);

        logger.info('summary', 'Summary saved as pending approval', {
            session_id: sessionId,
            data: { summaryLength: summary.length }
        });
    }

    /**
     * 确认总结入库
     */
    approve(sessionId: string): void {
        db.approveSession(sessionId);

        logger.info('summary', 'Summary approved and saved', {
            session_id: sessionId
        });
    }

    /**
     * 拒绝总结，结束会话
     */
    reject(sessionId: string, reason?: string): void {
        db.rejectSession(sessionId, reason);

        logger.info('summary', 'Summary rejected, session ended', {
            session_id: sessionId
        });
    }

    /**
     * 构建上下文文本
     */
    private buildContextText(
        context: ReturnType<typeof contextManager.buildContext>
    ): string {
        const { turns, values, insights, goals } = context;

        return `
【对话历史摘要】
${contextManager.formatTurnsAsText(turns.slice(-10))}

【发现的价值观】
${contextManager.formatValuesAsText(values)}

【关键洞察】
${contextManager.formatInsightsAsText(insights)}

【目标与行动】
${contextManager.formatGoalsAsText(goals)}
`.trim();
    }

    /**
     * 降级生成（AI 失败时使用）
     */
    private async fallbackGenerate(
        sessionId: string,
        context: ReturnType<typeof contextManager.buildContext>
    ): Promise<SummaryResult> {
        const { turns, values } = context;

        logger.warn('summary', 'Using fallback summary generation', {
            session_id: sessionId
        });

        // 简单拼接
        const summaryParts: string[] = [];

        if (values.length > 0) {
            summaryParts.push('在本次对话中，我们发现了以下价值观：');
            values.forEach(v => {
                summaryParts.push(`- ${v.value_name}（${v.domain}）`);
            });
        }

        summaryParts.push('');
        summaryParts.push('感谢你的分享，这次对话让我们对你有了更深的了解。');

        return {
            summary: summaryParts.join('\n'),
            keyInsights: [],
            valuesDiscovered: values.map(v => ({
                domain: v.domain,
                value: v.value_name,
                evidence: ''
            })),
            actionItems: [],
            isEnhanced: false
        };
    }
}

export const summaryGenerator = new SummaryGenerator();
