/**
 * OllamaService - Phase 2.1 个人画像问卷系统
 * 负责与 Ollama API 交互，提供各阶段的 AI 对话能力
 *
 * Author: 壮爸
 * Date: 2025-11-24
 * Version: 2.0.0 (TypeScript)
 */

import axios from 'axios';
import { getConfig } from '../config.js';

/**
 * Session interface for building prompts
 * 构建提示词的会话接口
 */
interface SessionInfo {
    question_text: string;
    initial_answer: string;
}

/**
 * Conversation message interface
 * 对话消息接口
 */
interface ConversationMessage {
    role: 'ai' | 'user';
    content: string;
    phase?: string;
    timestamp?: string;
}

/**
 * Generate options interface
 * 生成选项接口
 */
interface GenerateOptions {
    temperature?: number;
    top_p?: number;
    num_ctx?: number;
    num_predict?: number;
}

export class OllamaService {
    public model: string;
    private ollamaUrl: string;

    /**
     * 构造函数
     * @param model - 使用的模型，默认从配置读取
     * @param ollamaUrl - Ollama API URL
     */
    constructor(model?: string, ollamaUrl?: string) {
        const config = getConfig();
        this.model = model || config.models.default;
        this.ollamaUrl = ollamaUrl || config.ollama.url;
        console.log(`🤖 OllamaService 初始化 - 模型: ${this.model}`);
    }

    /**
     * 生成文本响应
     * @param prompt - 提示词
     * @param options - 生成选项
     * @returns 生成的文本
     */
    async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
        const config = getConfig();

        try {
            console.log(`📝 正在调用模型 ${this.model}...`);

            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: options.temperature || config.ollama.options.temperature,
                    top_p: options.top_p || config.ollama.options.top_p,
                    num_ctx: options.num_ctx || config.ollama.options.num_ctx,
                    num_predict: options.num_predict || config.ollama.options.num_predict
                }
            });

            return response.data.response;
        } catch (error) {
            const err = error as Error & { response?: { data: unknown } };
            console.error('❌ Ollama 生成失败:', err.message);
            if (err.response) {
                console.error('错误详情:', err.response.data);
            }
            throw error;
        }
    }

    /**
     * 构建阶段提示词
     * @param phase - 当前阶段
     * @param session - 会话信息
     * @param conversationHistory - 对话历史
     * @returns 构建的提示词
     */
    buildPhasePrompt(
        phase: string,
        session: SessionInfo,
        conversationHistory: ConversationMessage[]
    ): string {
        const baseContext = `
问题: ${session.question_text}
用户初始回答: ${session.initial_answer}

对话历史:
${conversationHistory.map(c => `${c.role === 'ai' ? '🤖 AI' : '👤 用户'}: ${c.content}`).join('\n')}
`;

        switch (phase) {
            case 'narrative':
                return this.buildNarrativePrompt(baseContext);
            case 'grow':
                return this.buildGrowPrompt(baseContext);
            case 'values':
                return this.buildValuesPrompt(baseContext);
            default:
                throw new Error(`未知的阶段: ${phase}`);
        }
    }

    /**
     * 叙事探索阶段提示词
     */
    private buildNarrativePrompt(context: string): string {
        return `你是一位经验丰富的访谈者，正在进行叙事探索阶段。

${context}

你的任务：
1. 基于用户的回答，使用 DICE 追问技术生成下一个追问
2. DICE 技术包括：
   - D (Descriptive): 描述性细节追问，激活情境记忆
   - I (Idiographic): 独特记忆追问，捕捉主观体验
   - C (Clarifying): 澄清性追问，明确模糊概念
   - E (Explanatory): 解释性追问，理解因果关系

规则：
- 每次只问一个问题
- 问题要具体、开放性强
- 避免是/否问题
- 展现温暖、好奇和同理心
- 不要机械重复，保持自然对话流

选择策略：
- 如果用户提到抽象概念（如"自由"、"成功"），使用 Clarifying
- 如果用户提到具体事件，使用 Descriptive 深挖细节
- 如果用户表达情绪，使用 Idiographic 探索内心
- 如果用户描述结果，使用 Explanatory 了解原因

输出严格的 JSON 格式：
{
  "question": "你的追问（一个开放性问题）",
  "dice_type": "descriptive或idiographic或clarifying或explanatory",
  "reasoning": "为什么选择这个追问（不超过50字）",
  "should_continue": true或false,
  "next_phase": null或"grow"
}

注意：每3-5轮追问后，如果已充分探索，设置 should_continue=false`;
    }

    /**
     * GROW 结构化阶段提示词
     */
    private buildGrowPrompt(context: string): string {
        return `你是一位专业教练，正在使用 GROW 模型进行结构化访谈。

${context}

GROW 模型四个维度：
1. Goal (目标): 探索用户想实现什么、理想状态是什么
2. Reality (现实): 了解当前状态、已有资源和面临的挑战
3. Options (选择): 发现可能的路径和解决方案
4. Will (意愿): 明确行动计划和所需支持

当前任务：
- 系统性地覆盖 GROW 四个维度
- 按 G→R→O→W 顺序进行，但可以根据对话灵活调整
- 每个维度至少有1-2个深入问题
- 关注用户的优势和资源，建立信心

输出严格的 JSON 格式：
{
  "question": "你的追问（一个具体、可操作的问题）",
  "grow_dimension": "goal或reality或options或will",
  "reasoning": "为什么问这个（不超过50字）",
  "should_continue": true或false,
  "next_phase": null或"values"
}

注意：当四个维度都充分探索后，设置 should_continue=false`;
    }

    /**
     * 价值澄清阶段提示词
     */
    private buildValuesPrompt(context: string): string {
        return `你是一位动机式访谈专家，正在进行价值观澄清。

${context}

核心价值观列表（供参考）：
自由、成就、关系、创造、安全、正义、健康、成长、影响力、平衡、
冒险、知识、美、和谐、自主、贡献、乐趣、传统、地位、认可、
诚实、家庭、稳定、挑战、独立、归属、创新、责任、财富、权力

你的任务：
1. 帮助用户识别最重要的 3-5 个核心价值观
2. 探索每个价值观对用户的个人意义
3. 发现价值观之间的冲突和协调
4. 区分内在动机和外部压力

访谈技巧：
- 避免说教和价值判断
- 不要引导用户选择特定价值观
- 允许矛盾和悖论存在
- 专注于"为什么"而非"是什么"
- 用具体例子帮助用户澄清

输出严格的 JSON 格式：
{
  "question": "你的追问（探索价值观的开放性问题）",
  "focus": "identification或definition或conflict或motivation",
  "reasoning": "为什么问这个（不超过50字）",
  "should_continue": true或false,
  "next_phase": null或"summary"
}

focus 说明：
- identification: 识别核心价值观
- definition: 探索价值观的个人定义
- conflict: 发现价值观冲突
- motivation: 区分内在外在动机

注意：当核心价值观充分澄清后，设置 should_continue=false`;
    }

    /**
     * 生成深度分析（三层洞察）
     */
    buildAnalysisPrompt(
        question: string,
        initialAnswer: string,
        transcript: ConversationMessage[]
    ): string {
        return `你是一位专业的人格画像分析师。请基于完整对话生成深度分析。

问题: ${question}

用户初始回答: ${initialAnswer}

完整对话记录:
${transcript.map(c => `${c.role === 'ai' ? '🤖 AI' : '👤 用户'}: ${c.content}`).join('\n')}

分析要求：
1. 严格区分三个层次的洞察：
   - 事实层(fact): 用户明确表达的内容，置信度 0.9-1.0
   - 解释层(interpretation): 基于单次对话的理解，置信度 0.5-0.7
   - 洞察层(insight): 多条证据支持的深层模式，置信度 0.6-0.8

2. 每个洞察必须有明确的证据支持

3. 避免过度推断和主观臆测

4. 保持专业、客观、简洁的语言

请生成严格的 JSON 格式分析：
{
  "core_values": [
    {
      "value_name": "价值观名称",
      "importance_rank": 1到5的数字,
      "definition": "用户对该价值观的个人定义",
      "origin_story": "价值观形成的故事或原因",
      "evidence": ["支持证据1", "支持证据2"]
    }
  ],
  "turning_points": [
    {
      "event_description": "事件描述",
      "time_period": "时间段",
      "before_state": "转折前状态",
      "after_state": "转折后状态",
      "impact": "影响描述",
      "related_values": ["相关价值观1", "相关价值观2"]
    }
  ],
  "goals": [
    {
      "goal_description": "目标描述",
      "goal_type": "long_term或short_term或aspirational",
      "motivation": "内在动机",
      "obstacles": "面临的障碍",
      "resources": "已有的资源"
    }
  ],
  "behavioral_patterns": [
    {
      "pattern_type": "decision_making或coping或social或work_style",
      "pattern_description": "模式描述",
      "trigger_context": "触发情境",
      "typical_response": "典型反应"
    }
  ],
  "personality_traits": [
    {
      "trait_dimension": "特质维度",
      "trait_description": "特质描述",
      "evidence": ["证据1", "证据2"]
    }
  ],
  "insights": [
    {
      "layer": "fact或interpretation或insight",
      "category": "value或turning_point或behavior或emotion或goal或strength或challenge",
      "content": "洞察内容",
      "evidence": "支持证据（用户原话）",
      "confidence": 0.5到1.0的数值
    }
  ]
}

注意：
- 所有字段使用中文
- 如果某个类别没有足够信息，该数组可以为空
- 确保 JSON 格式正确，可以被解析`;
    }

    /**
     * 检查 Ollama 服务状态
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.ollamaUrl}/api/tags`);
            const models = response.data.models || [];
            const hasModel = models.some((m: { name: string }) => m.name === this.model);

            if (!hasModel) {
                console.warn(`⚠️ 模型 ${this.model} 未找到，可用模型:`, models.map((m: { name: string }) => m.name));
                return false;
            }

            console.log(`✅ Ollama 服务正常，模型 ${this.model} 可用`);
            return true;
        } catch (error) {
            console.error('❌ Ollama 服务不可用:', (error as Error).message);
            return false;
        }
    }

    /**
     * 设置模型（用于切换模型）
     */
    setModel(model: string): void {
        this.model = model;
        console.log(`🔄 切换模型为: ${model}`);
    }
}
