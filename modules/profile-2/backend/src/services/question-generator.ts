/**
 * Profile-2 追问生成器
 * 基于当前阶段和上下文生成AI追问
 * 使用 Ollama Structured Outputs 保证 JSON 输出可靠性
 */

import { ollamaService } from './ollama-service.js';
import { contextManager } from './context-manager.js';
import { contextCompressor } from './context-compressor.js';
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
import {
  ValuesNarrativeSchema,
  ValuesValidationSchema,
  DeepExplorationSchema,
  SummarySchema,
  EnhancedSummarySchema,
  type SummaryResponse,
  type EnhancedSummaryResponse
} from '../schemas/index.js';
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
    const { session, turns, values, strategy } = context;
    const currentPhase = session.current_phase as PhaseType;

    logger.debug('context', 'Generating response', {
      session_id: sessionId,
      data: {
        phase: currentPhase,
        turn: turns.length + 1,
        user_msg_len: userMessage.length
      }
    });

    // 检查是否需要压缩上下文
    const compressed = await contextCompressor.compress(sessionId, turns, values);

    // 构建消息历史（使用压缩后的上下文）
    const messages = this.buildMessages(
      compressed.compressed ? compressed.recentTurns : turns,
      userMessage,
      compressed.compressed ? contextCompressor.formatCompressedContext(compressed) : undefined
    );

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

        // 保存GROW阶段的最后一轮
        db.addTurn({
          sessionId,
          turnNumber: turns.length + 1,
          phase: currentPhase,
          userMessage,
          aiMessage: aiResponse,
          probeType: 'grow_complete'
        });
        db.updateSessionTurnCount(sessionId, turns.length + 1);

        const duration = Date.now() - startTime;
        logger.info('context', 'GROW completed, ready for summary', {
          session_id: sessionId,
          duration_ms: duration
        });

        // 返回标记让前端调用独立的 summary API
        return {
          response: aiResponse,
          phase: 'summary' as PhaseType,
          turnNumber: turns.length + 1,
          phaseTransition: {
            from: currentPhase,
            to: 'summary' as PhaseType,
            reason: 'GROW阶段完成'
          },
          isComplete: false,
          requiresSummary: true,  // 新标记：需要前端调用 summary API
          metadata: {}
        };
      }
    } else {
      // 其他阶段：使用通用流程
      const systemPrompt = this.getPhasePrompt(currentPhase, sessionId, context);

      // Opening阶段纯文本，其他阶段使用 Structured Outputs
      if (currentPhase === 'opening') {
        const response = await ollamaService.generateWithHistory(
          systemPrompt,
          messages,
          sessionId
        );
        aiResponse = response.trim();
      } else {
        const schema = this.getPhaseSchema(currentPhase, strategy?.summaryEnhanced);
        const structured = await ollamaService.generateStructured<{
          response: string;
          dice_type?: string;
          detected_values?: string[];
          reasoning?: string;
        }>(
          systemPrompt,
          messages,
          schema,
          sessionId
        );
        aiResponse = structured.response;
        probeType = structured.dice_type;
        reasoning = structured.reasoning;
        detectedValues = structured.detected_values;
      }
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

        // 如果转换到 summary 阶段，返回标记让前端调用 summary API
        if (evaluation.nextPhase === 'summary') {
          const duration = Date.now() - startTime;
          logger.info('context', 'Phase transitioned to summary, ready for summary generation', {
            session_id: sessionId,
            duration_ms: duration
          });

          return {
            response: aiResponse,
            phase: 'summary' as PhaseType,
            turnNumber: turns.length + 1,
            phaseTransition: {
              from: currentPhase,
              to: 'summary' as PhaseType,
              reason: evaluation.reasoning
            },
            isComplete: false,
            requiresSummary: true,  // 新标记：需要前端调用 summary API
            metadata: {
              probeType,
              detectedValues
            }
          };
        }
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
   * 获取阶段对应的 Zod Schema
   * 用于 Ollama Structured Outputs
   */
  private getPhaseSchema(phase: PhaseType, summaryEnhanced?: boolean) {
    switch (phase) {
      case 'values_narrative':
        return ValuesNarrativeSchema;
      case 'values_validation':
        return ValuesValidationSchema;
      case 'deep_exploration':
        return DeepExplorationSchema;
      case 'summary':
        return summaryEnhanced ? EnhancedSummarySchema : SummarySchema;
      default:
        return ValuesNarrativeSchema;
    }
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
   * @param turns - 对话轮次（可能是压缩后的最近轮次）
   * @param currentUserMessage - 当前用户消息
   * @param compressionSummary - 压缩摘要文本（如果已压缩）
   */
  private buildMessages(
    turns: Array<{ user_message: string; ai_message: string }>,
    currentUserMessage: string,
    compressionSummary?: string
  ): Message[] {
    const messages: Message[] = [];

    // 如果有压缩摘要，作为系统上下文添加
    if (compressionSummary) {
      messages.push({
        role: 'system',
        content: compressionSummary
      });
    }

    // 最近5轮对话（或全部，如果已压缩则只有最近几轮）
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
   * @deprecated 已由 generateStructured() 替代，仅保留作为降级方案
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
   * @deprecated 请使用独立的 summaryGenerator.generate() 代替
   * 此方法保留仅为向后兼容
   */
  async generateFinalSummary(sessionId: string): Promise<string> {
    // 委托给独立的 summaryGenerator
    const { summaryGenerator } = await import('./summary-generator.js');
    const result = await summaryGenerator.generate(sessionId);
    summaryGenerator.savePending(sessionId, result.summary);
    return result.summary;
  }
}

export const questionGenerator = new QuestionGenerator();
