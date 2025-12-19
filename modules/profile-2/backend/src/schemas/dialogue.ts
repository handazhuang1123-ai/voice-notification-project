/**
 * 对话生成相关的 Zod Schema
 * 覆盖 6 种阶段的输出格式
 */

import { z } from 'zod';

// ============ Values Narrative 阶段 ============
export const ValuesNarrativeSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    dice_type: z.enum(['D', 'I', 'C', 'E']).describe('DICE追问类型'),
    detected_values: z.array(z.string()).describe('识别到的价值观'),
    reasoning: z.string().describe('内部思考（不会显示给用户）')
});

export type ValuesNarrativeResponse = z.infer<typeof ValuesNarrativeSchema>;

// ============ Values Validation 阶段 ============
export const ValuesValidationSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    values_presented: z.array(z.string()).describe('呈现的价值观列表'),
    action: z.enum(['present', 'confirm', 'rank']).describe('当前动作')
});

export type ValuesValidationResponse = z.infer<typeof ValuesValidationSchema>;

// ============ Deep Exploration 阶段 ============
export const DeepExplorationSchema = z.object({
    response: z.string().describe('给用户的回复（纯对话，禁止包含括号注释）'),
    exploration_focus: z.string().describe('当前探索的焦点'),
    depth_indicator: z.number().min(1).max(3).describe('深度指标 1-3'),
    key_insights: z.array(z.string()).describe('发现的洞察')
});

export type DeepExplorationResponse = z.infer<typeof DeepExplorationSchema>;

// ============ Summary 阶段 ============
export const SummarySchema = z.object({
    summary: z.string().describe('完整的总结文本（纯内容，无注释）'),
    key_insights: z.array(z.string()).describe('关键洞察'),
    values_discovered: z.array(z.object({
        domain: z.string().describe('领域'),
        value: z.string().describe('价值观'),
        evidence: z.string().describe('支撑证据')
    })).describe('发现的价值观'),
    action_items: z.array(z.string()).describe('行动项'),
    closing_message: z.string().describe('温暖的结束语')
});

export type SummaryResponse = z.infer<typeof SummarySchema>;

// ============ Enhanced Summary 阶段 ============
export const EnhancedSummarySchema = z.object({
    integrated_summary: z.string().describe('跨问题整合的总结（纯内容）'),
    timeline_insights: z.string().describe('时间线上的发现'),
    cross_domain_patterns: z.array(z.string()).describe('跨领域的模式'),
    core_traits: z.array(z.string()).describe('核心特质'),
    life_philosophy: z.string().describe('提炼的人生哲学'),
    final_message: z.string().describe('温暖的收尾')
});

export type EnhancedSummaryResponse = z.infer<typeof EnhancedSummarySchema>;
