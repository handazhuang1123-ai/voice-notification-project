/**
 * GROW 阶段相关的 Zod Schema
 * 覆盖 4 种子阶段的输出格式
 */

import { z } from 'zod';

// ============ Goal 子阶段 ============
export const GrowGoalSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    goal_clarity: z.number().min(1).max(5).describe('目标清晰度 1-5'),
    smart_check: z.object({
        specific: z.boolean(),
        measurable: z.boolean(),
        achievable: z.boolean(),
        relevant: z.boolean(),
        time_bound: z.boolean()
    }).describe('SMART检验结果'),
    extracted_goal: z.string().describe('提取的目标描述')
});

export type GrowGoalResponse = z.infer<typeof GrowGoalSchema>;

// ============ Reality 子阶段 ============
export const GrowRealitySchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    reality_elements: z.object({
        current_state: z.string().describe('当前状态描述'),
        obstacles: z.array(z.string()).describe('障碍列表'),
        resources: z.array(z.string()).describe('可用资源'),
        attempts: z.array(z.string()).describe('已尝试的方法')
    }).describe('现状分析要素')
});

export type GrowRealityResponse = z.infer<typeof GrowRealitySchema>;

// ============ Options 子阶段 ============
export const GrowOptionsSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    options_generated: z.array(z.string()).describe('生成的选项'),
    evaluation_criteria: z.array(z.string()).describe('评估标准'),
    user_preference: z.string().describe('用户倾向的选项')
});

export type GrowOptionsResponse = z.infer<typeof GrowOptionsSchema>;

// ============ Way Forward 子阶段 ============
export const GrowWayForwardSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    action_plan: z.object({
        first_step: z.string().describe('第一步行动'),
        timeline: z.string().describe('时间安排'),
        contingency: z.string().describe('应对障碍的策略'),
        support: z.string().describe('支持资源')
    }).describe('行动计划'),
    commitment_level: z.number().min(1).max(10).describe('承诺度 1-10')
});

export type GrowWayForwardResponse = z.infer<typeof GrowWayForwardSchema>;
