/**
 * Profile-2 追问生成器
 * 基于当前阶段和上下文生成AI追问
 */

import { ollamaService } from './ollama-service.js';
import { contextManager } from './context-manager.js';
import { phaseEvaluator } from './phase-evaluator.js';
import { growHandler } from './grow-handler.js';
import { db } from './database.js';
import { logger } from './logger.js';
import {
  OPENING_PROMPT,
  VALUES_NARRATIVE_PROMPT,
  VALUES_VALIDATION_PROMPT,
  DEEP_EXPLORATION_PROMPT,
  SUMMARY_PROMPT,
  ENHANCED_SUMMARY_PROMPT
} from '../prompts/system-prompts.js';
import type {
  PhaseType,
  GenerateResponse,
  Message
} from '../types.js';

class QuestionGenerator {
  /**
   * 生成AI回复
   */
  async generate(
    sessionId: string,
    userMessage: string
  ): Promise<GenerateResponse> {
    const startTime = Date.now();

    // 获取上下文
    const context = contextManager.buildContext(sessionId);
    const { session, turns, strategy } = context;
    const currentPhase = session.current_phase as PhaseType;

    logger.debug('context', 'Generating response', {
      session_id: sessionId,
      data: {
        phase: currentPhase,
        turn: turns.length + 1,
        user_msg_len: userMessage.length
      }
    });

    // 构建消息历史
    const messages = this.buildMessages(turns, userMessage);

    let aiResponse: string;
    let probeType: string | undefined;
    let reasoning: string | undefined;
    let detectedValues: string[] | undefined;

    // GROW阶段：使用专用处理器
    if (currentPhase === 'grow') {
      const growResult = await growHandler.generate(
        sessionId,
        session.user_id,
        userMessage,
        messages
      );
      aiResponse = growResult.response;

      // GROW完成后检查是否需要转换到Summary
      if (growResult.nextSubPhase === null) {
        // GROW已完成，触发阶段转换
        await phaseEvaluator.transition(sessionId, 'summary', 'GROW阶段完成');
      }
    } else {
      // 其他阶段：使用通用流程
      const systemPrompt = this.getPhasePrompt(currentPhase, sessionId, context);
      const response = await ollamaService.generateWithHistory(
        systemPrompt,
        messages,
        sessionId
      );
      const parsed = this.parseResponse(response, currentPhase, sessionId);
      aiResponse = parsed.response;
      probeType = parsed.probeType;
      reasoning = parsed.reasoning;
      detectedValues = parsed.detectedValues;
    }

    // 保存轮次
    const turnId = db.addTurn({
      sessionId,
      turnNumber: turns.length + 1,
      phase: currentPhase,
      userMessage,
      aiMessage: aiResponse,
      probeType,
      aiReasoning: reasoning
    });

    // 更新轮次计数
    db.updateSessionTurnCount(sessionId, turns.length + 1);

    // 处理提取的价值观（非GROW阶段）
    if (detectedValues && detectedValues.length > 0) {
      this.saveDetectedValues(sessionId, session.user_id, detectedValues, turnId);
    }

    // 评估是否需要转换阶段（非GROW阶段）
    let evaluation: { shouldTransition: boolean; nextPhase?: PhaseType; reasoning?: string } = {
      shouldTransition: false
    };
    if (currentPhase !== 'grow') {
      evaluation = await phaseEvaluator.evaluate(sessionId);

      if (evaluation.shouldTransition && evaluation.nextPhase) {
        await phaseEvaluator.transition(
          sessionId,
          evaluation.nextPhase,
          evaluation.reasoning
        );
      }
    }

    const duration = Date.now() - startTime;
    logger.info('context', 'Response generated', {
      session_id: sessionId,
      duration_ms: duration,
      data: {
        phase: currentPhase,
        transition: evaluation.shouldTransition,
        next_phase: evaluation.nextPhase
      }
    });

    return {
      response: aiResponse,
      phase: evaluation.shouldTransition ? evaluation.nextPhase! : currentPhase,
      turnNumber: turns.length + 1,
      phaseTransition: evaluation.shouldTransition ? {
        from: currentPhase,
        to: evaluation.nextPhase!,
        reason: evaluation.reasoning
      } : undefined,
      metadata: {
        probeType,
        detectedValues
      }
    };
  }

  /**
   * 获取阶段对应的提示词
   * 注意：GROW阶段由 growHandler 独立处理，不经过此方法
   */
  private getPhasePrompt(
    phase: PhaseType,
    sessionId: string,
    context: ReturnType<typeof contextManager.buildContext>
  ): string {
    const { values, insights, strategy } = context;

    switch (phase) {
      case 'opening':
        return OPENING_PROMPT;

      case 'values_narrative':
        return VALUES_NARRATIVE_PROMPT;

      case 'values_validation':
        const valuesText = contextManager.formatValuesAsText(values);
        return VALUES_VALIDATION_PROMPT + `\n\n【已发现的价值观】\n${valuesText}`;

      case 'deep_exploration':
        const insightsText = contextManager.formatInsightsAsText(insights);
        return DEEP_EXPLORATION_PROMPT + `\n\n【已有洞察】\n${insightsText}`;

      case 'summary':
        if (strategy?.summaryEnhanced) {
          return ENHANCED_SUMMARY_PROMPT;
        }
        return SUMMARY_PROMPT;

      default:
        return VALUES_NARRATIVE_PROMPT;
    }
  }

  /**
   * 构建消息历史
   */
  private buildMessages(
    turns: Array<{ user_message: string; ai_message: string }>,
    currentUserMessage: string
  ): Message[] {
    const messages: Message[] = [];

    // 最近5轮对话
    const recentTurns = turns.slice(-5);
    for (const turn of recentTurns) {
      messages.push({ role: 'user', content: turn.user_message });
      messages.push({ role: 'assistant', content: turn.ai_message });
    }

    // 当前用户消息
    messages.push({ role: 'user', content: currentUserMessage });

    return messages;
  }

  /**
   * 解析AI响应
   */
  private parseResponse(
    response: string,
    phase: PhaseType,
    sessionId: string
  ): {
    response: string;
    probeType?: string;
    reasoning?: string;
    detectedValues?: string[];
  } {
    // Opening阶段：直接返回文本
    if (phase === 'opening') {
      return { response: response.trim() };
    }

    // 尝试解析JSON
    try {
      const parsed = ollamaService.parseJsonResponse<{
        response: string;
        dice_type?: string;
        detected_values?: string[];
        reasoning?: string;
        summary?: string;
        closing_message?: string;
      }>(response, sessionId);

      // Summary阶段特殊处理
      if (phase === 'summary') {
        const summaryText = parsed.summary || parsed.response;
        const closing = parsed.closing_message || '';
        return {
          response: closing ? `${summaryText}\n\n${closing}` : summaryText
        };
      }

      return {
        response: parsed.response,
        probeType: parsed.dice_type,
        reasoning: parsed.reasoning,
        detectedValues: parsed.detected_values
      };
    } catch {
      // JSON解析失败，返回原始响应
      logger.warn('context', 'Response parse failed, using raw', {
        session_id: sessionId,
        data: { phase, response_preview: response.slice(0, 100) }
      });

      return { response: response.trim() };
    }
  }

  /**
   * 保存检测到的价值观
   */
  private saveDetectedValues(
    sessionId: string,
    userId: string,
    values: string[],
    turnId: number
  ): void {
    for (const valueName of values) {
      // 简单的领域推断（可以后续增强）
      const domain = this.inferDomain(valueName);

      db.addValue({
        userId,
        sessionId,
        domain,
        valueName,
        depthLayer: 1,
        evidenceTurnId: turnId
      });
    }
  }

  /**
   * 推断价值观领域
   */
  private inferDomain(valueName: string): string {
    const domainKeywords: Record<string, string[]> = {
      '家庭': ['家', '父母', '孩子', '伴侣', '亲情'],
      '事业': ['工作', '职业', '成就', '成功', '贡献'],
      '成长': ['学习', '进步', '发展', '突破', '挑战'],
      '关系': ['朋友', '社交', '信任', '忠诚', '归属'],
      '健康': ['身体', '心理', '平衡', '健康'],
      '自由': ['独立', '自主', '选择', '掌控']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(k => valueName.includes(k))) {
        return domain;
      }
    }

    return '其他';
  }

  /**
   * 生成最终总结
   */
  async generateFinalSummary(sessionId: string): Promise<string> {
    const context = contextManager.buildContext(sessionId);
    const { session, turns, values, insights, goals, strategy } = context;

    const prompt = strategy?.summaryEnhanced
      ? ENHANCED_SUMMARY_PROMPT
      : SUMMARY_PROMPT;

    const contextText = `
【对话历史摘要】
${contextManager.formatTurnsAsText(turns.slice(-10))}

【发现的价值观】
${contextManager.formatValuesAsText(values)}

【关键洞察】
${contextManager.formatInsightsAsText(insights)}

【目标与行动】
${contextManager.formatGoalsAsText(goals)}
`;

    const fullPrompt = prompt + '\n\n' + contextText;

    const response = await ollamaService.generate(fullPrompt, sessionId);

    try {
      const parsed = ollamaService.parseJsonResponse<{
        summary?: string;
        integrated_summary?: string;
        final_message?: string;
      }>(response, sessionId);

      const summary = parsed.integrated_summary || parsed.summary || response;
      const finalMessage = parsed.final_message || '';

      const finalSummary = finalMessage ? `${summary}\n\n${finalMessage}` : summary;

      // 保存并完成会话
      db.completeSession(sessionId, finalSummary);

      return finalSummary;
    } catch {
      // 降级处理
      db.completeSession(sessionId, response);
      return response;
    }
  }
}

export const questionGenerator = new QuestionGenerator();
