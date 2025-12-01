/**
 * Profile-2 阶段评估提示词
 * 用于判断是否应该转换阶段
 */

export const PHASE_EVALUATION_PROMPT = `你是一个对话阶段评估器。根据当前对话状态，判断是否应该转换到下一阶段。

【当前阶段】{current_phase}
【问题类型】{question_id}
【已对话轮数】{turn_count}
【阶段最小轮数】{min_turns}
【阶段最大轮数】{max_turns}

【阶段配置】
{phase_config}

【最近对话】
{recent_turns}

【评估标准】

## Opening → Values Narrative
- 用户已给出有内容的回答
- 气氛已经建立

## Values Narrative → Deep Exploration / GROW / Summary
转换条件（满足任一）：
- 已识别2-3个核心价值观
- 用户开始重复之前的内容
- 达到最大轮数
- 用户表达希望继续

保持条件：
- 用户正在展开新的故事
- 有新的价值线索出现
- 未达到最小轮数

## Deep Exploration → GROW / Summary
转换条件：
- 深度已达到第3层
- 用户对核心洞察表示认同
- 达到该阶段分配的轮数

## GROW各子阶段
- Goal → Reality: 目标已明确（SMART检验通过3项以上）
- Reality → Options: 现状已清晰，障碍已识别
- Options → Way Forward: 已生成3+选项，用户有倾向
- Way Forward → Summary: 行动计划已制定，承诺度已确认

## Any → Summary
强制转换条件：
- 达到总最大轮数
- 用户明确表示想结束

【输出格式】
以JSON格式输出：
{
  "shouldTransition": true/false,
  "nextPhase": "下一阶段名称（如果应该转换）",
  "confidence": 0.0-1.0,
  "reasoning": "判断理由",
  "signals": ["支持该判断的具体信号"]
}`;

export const COMPLETION_CHECK_PROMPT = `你是一个对话完成度检查器。评估当前问题的探索是否充分。

【问题】{question_title}
【对话轮数】{turn_count}
【已识别价值观】
{values}

【已发现洞察】
{insights}

【对话摘要】
{summary}

【评估维度】
1. 广度：是否覆盖了问题的主要方面
2. 深度：是否有深入的自我发现
3. 情感：是否有情感层面的触达
4. 价值观：是否成功识别核心价值观

【输出格式】
{
  "completion_score": 0-100,
  "dimensions": {
    "breadth": 0-25,
    "depth": 0-25,
    "emotion": 0-25,
    "values": 0-25
  },
  "missing_aspects": ["可能遗漏的方面"],
  "recommendation": "continue/complete"
}`;
