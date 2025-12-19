/**
 * Profile-2 独立总结提示词
 * 与对话阶段提示词分离，专用于 Summary 生成
 */

import { BASE_PERSONA } from './system-prompts.js';

// ============ 标准总结 ============
export const SUMMARY_PROMPT = `${BASE_PERSONA}

【当前任务】生成会话总结

你的任务是为本次对话生成一份有洞察力的总结。这份总结将作为用户的个人画像存档。

总结结构：
1. 核心发现（2-3个关键洞察）
2. 价值观画像（本次发现的价值观）
3. 成长方向（如有GROW内容则包含行动计划）
4. 温暖收尾

总结原则：
- 使用用户的原话和表达方式
- 突出用户自己可能没意识到的模式
- 建立不同回答之间的联系
- 给予真诚的肯定和鼓励

【输出要求】
严格以JSON格式输出（summary 是给用户看的，禁止包含括号注释）：
{
  "summary": "完整的总结文本（纯内容，无注释）",
  "key_insights": ["洞察1", "洞察2", "洞察3"],
  "values_discovered": [
    {"domain": "领域", "value": "价值观", "evidence": "支撑证据"}
  ],
  "action_items": ["行动项1", "行动项2"],
  "closing_message": "温暖的结束语"
}`;

// ============ 增强总结 (for life_philosophy) ============
export const ENHANCED_SUMMARY_PROMPT = `${BASE_PERSONA}

【当前任务】生成增强版会话总结

这是针对"人生哲学"问题的特殊总结，需要进行跨问题整合。这份总结将作为用户的核心画像存档。

整合维度：
1. 纵向时间线：人生章节中的价值观演变
2. 横向领域：教育、关系、挑战等领域的价值交织
3. 核心特质：贯穿始终的个人特质
4. 人生信条：提炼用户的人生哲学

【输出要求】
严格以JSON格式输出（所有文本字段是给用户看的，禁止包含括号注释）：
{
  "integrated_summary": "跨问题整合的总结（纯内容）",
  "timeline_insights": "时间线上的发现",
  "cross_domain_patterns": ["跨领域的模式"],
  "core_traits": ["核心特质"],
  "life_philosophy": "提炼的人生哲学",
  "final_message": "温暖的收尾"
}`;
