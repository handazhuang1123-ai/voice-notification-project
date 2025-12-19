/**
 * 系统评估相关的 Zod Schema
 * 覆盖阶段评估和完成度检查
 */

import { z } from 'zod';

// ============ 阶段评估 ============
export const PhaseEvaluationSchema = z.object({
    shouldTransition: z.boolean().describe('是否应该转换阶段'),
    nextPhase: z.enum([
        'opening',
        'values_narrative',
        'values_validation',
        'deep_exploration',
        'grow',
        'summary'
    ]).describe('下一阶段名称'),
    confidence: z.number().min(0).max(1).describe('置信度 0-1'),
    reasoning: z.string().describe('简短理由（一句话）'),
    signals: z.array(z.string()).describe('具体信号')
});

export type PhaseEvaluationResponse = z.infer<typeof PhaseEvaluationSchema>;

// ============ 完成度检查 ============
export const CompletionCheckSchema = z.object({
    completion_score: z.number().min(0).max(100).describe('完成度分数 0-100'),
    dimensions: z.object({
        breadth: z.number().min(0).max(25).describe('广度分数'),
        depth: z.number().min(0).max(25).describe('深度分数'),
        emotion: z.number().min(0).max(25).describe('情感分数'),
        values: z.number().min(0).max(25).describe('价值观分数')
    }).describe('各维度评分'),
    missing_aspects: z.array(z.string()).describe('可能遗漏的方面'),
    recommendation: z.enum(['continue', 'complete']).describe('建议')
});

export type CompletionCheckResponse = z.infer<typeof CompletionCheckSchema>;
