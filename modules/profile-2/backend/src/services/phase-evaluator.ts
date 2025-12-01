/**
 * Profile-2 阶段评估器
 * 判断是否应该转换对话阶段
 */

import { ollamaService } from './ollama-service.js';
import { contextManager } from './context-manager.js';
import { db } from './database.js';
import { logger } from './logger.js';
import { getQuestionStrategy, getNextPhase } from '../config.js';
import { PHASE_EVALUATION_PROMPT, COMPLETION_CHECK_PROMPT } from '../prompts/phase-evaluation.js';
import type { PhaseType, PhaseEvaluationResult } from '../types.js';

/** 完成度检查结果 */
interface CompletionCheckResult {
  completionScore: number;
  dimensions: {
    breadth: number;
    depth: number;
    emotion: number;
    values: number;
  };
  missingAspects: string[];
  recommendation: 'continue' | 'complete';
}

/** 完成度阈值 */
const COMPLETION_THRESHOLD = 80;

class PhaseEvaluator {
  /**
   * 评估是否应该转换阶段
   */
  async evaluate(sessionId: string): Promise<PhaseEvaluationResult> {
    const context = contextManager.buildContext(sessionId);
    const { session, turns, values, strategy } = context;

    if (!strategy) {
      return {
        shouldTransition: false,
        confidence: 1,
        reasoning: '无策略配置，保持当前阶段'
      };
    }

    const currentPhase = session.current_phase as PhaseType;
    const phaseTurns = db.getPhaseTurns(sessionId, currentPhase);
    const recentTurns = turns.slice(-3);

    // 快速规则检查
    const quickResult = this.quickRuleCheck(
      currentPhase,
      turns.length,
      phaseTurns.length,
      values.length,
      strategy,
      session.question_id
    );

    if (quickResult) {
      logger.info('phase', 'Quick rule triggered', {
        session_id: sessionId,
        data: { result: quickResult }
      });
      return quickResult;
    }

    // AI评估
    const prompt = this.buildEvaluationPrompt(
      currentPhase,
      session.question_id,
      turns.length,
      strategy,
      recentTurns,
      values
    );

    try {
      const response = await ollamaService.generate(prompt, sessionId);
      const result = ollamaService.parseJsonResponse<PhaseEvaluationResult>(response, sessionId);

      logger.info('phase', 'AI evaluation complete', {
        session_id: sessionId,
        data: {
          should_transition: result.shouldTransition,
          next_phase: result.nextPhase,
          confidence: result.confidence,
          reasoning: result.reasoning
        }
      });

      // 如果AI建议转换到Summary，进行完成度二次确认
      if (result.shouldTransition && result.nextPhase === 'summary') {
        const completionCheck = await this.checkCompletion(sessionId, context);

        if (completionCheck.completionScore < COMPLETION_THRESHOLD) {
          // 完成度不足，阻止转换
          logger.warn('phase', 'Completion check FAILED - transition blocked', {
            session_id: sessionId,
            data: {
              score: completionCheck.completionScore,
              threshold: COMPLETION_THRESHOLD,
              dimensions: completionCheck.dimensions,
              missing: completionCheck.missingAspects
            }
          });

          return {
            shouldTransition: false,
            confidence: result.confidence,
            reasoning: `完成度检查未通过 (${completionCheck.completionScore}/${COMPLETION_THRESHOLD})，继续当前阶段`
          };
        }

        // 完成度通过
        logger.info('phase', 'Completion check PASSED', {
          session_id: sessionId,
          data: {
            score: completionCheck.completionScore,
            threshold: COMPLETION_THRESHOLD,
            dimensions: completionCheck.dimensions
          }
        });
      }

      return result;
    } catch (error) {
      logger.warn('phase', 'AI evaluation failed, using default', {
        session_id: sessionId,
        data: { error: String(error) }
      });

      // 降级：使用简单规则
      return this.fallbackEvaluation(currentPhase, turns.length, strategy, session.question_id);
    }
  }

  /**
   * 快速规则检查（不需要AI）
   */
  private quickRuleCheck(
    currentPhase: PhaseType,
    totalTurns: number,
    phaseTurns: number,
    valueCount: number,
    strategy: { minTurns: number; maxTurns: number },
    questionId: string
  ): PhaseEvaluationResult | null {
    // 强制转换：达到最大轮数
    if (totalTurns >= strategy.maxTurns) {
      return {
        shouldTransition: true,
        nextPhase: 'summary',
        confidence: 1,
        reasoning: '达到最大轮数，强制进入总结'
      };
    }

    // Opening 阶段：1-2轮后自动转换
    if (currentPhase === 'opening' && phaseTurns >= 1) {
      const nextPhase = getNextPhase(questionId, currentPhase);
      if (nextPhase) {
        return {
          shouldTransition: true,
          nextPhase,
          confidence: 0.9,
          reasoning: 'Opening阶段完成，进入主要叙事'
        };
      }
    }

    // 价值观验证阶段：特殊处理
    if (currentPhase === 'values_validation' && phaseTurns >= 3) {
      return {
        shouldTransition: true,
        nextPhase: 'summary',
        confidence: 0.85,
        reasoning: '价值观验证已完成'
      };
    }

    return null;
  }

  /**
   * 降级评估（AI失败时使用）
   */
  private fallbackEvaluation(
    currentPhase: PhaseType,
    totalTurns: number,
    strategy: { minTurns: number; maxTurns: number },
    questionId: string
  ): PhaseEvaluationResult {
    // 达到最小轮数的80%时开始考虑转换
    const threshold = Math.floor(strategy.minTurns * 0.8);

    if (totalTurns >= threshold) {
      const nextPhase = getNextPhase(questionId, currentPhase);
      if (nextPhase) {
        return {
          shouldTransition: true,
          nextPhase,
          confidence: 0.6,
          reasoning: '达到最小轮数阈值，建议转换'
        };
      }
    }

    return {
      shouldTransition: false,
      confidence: 0.5,
      reasoning: '继续当前阶段'
    };
  }

  /**
   * 构建评估提示词
   */
  private buildEvaluationPrompt(
    currentPhase: PhaseType,
    questionId: string,
    turnCount: number,
    strategy: { minTurns: number; maxTurns: number },
    recentTurns: Array<{ user_message: string; ai_message: string }>,
    values: Array<{ value_name: string; domain: string }>
  ): string {
    const turnsText = recentTurns.map(t =>
      `用户: ${t.user_message}\nAI: ${t.ai_message}`
    ).join('\n---\n');

    const valuesText = values.map(v => `${v.domain}: ${v.value_name}`).join(', ');

    return PHASE_EVALUATION_PROMPT
      .replace('{current_phase}', currentPhase)
      .replace('{question_id}', questionId)
      .replace('{turn_count}', String(turnCount))
      .replace('{min_turns}', String(strategy.minTurns))
      .replace('{max_turns}', String(strategy.maxTurns))
      .replace('{phase_config}', `已识别价值观: ${valuesText || '暂无'}`)
      .replace('{recent_turns}', turnsText);
  }

  /**
   * 执行阶段转换
   */
  async transition(sessionId: string, toPhase: PhaseType, reasons?: string): Promise<void> {
    const session = db.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const fromPhase = session.current_phase as PhaseType;
    const turnCount = db.getSessionTurns(sessionId).length;

    // 记录转换
    db.recordTransition({
      sessionId,
      fromPhase,
      toPhase,
      reasons,
      turnNumber: turnCount
    });

    // 更新会话阶段
    db.updateSessionPhase(sessionId, toPhase);

    logger.info('phase', `Phase transition executed`, {
      session_id: sessionId,
      data: { from: fromPhase, to: toPhase, turn: turnCount }
    });
  }

  /**
   * 检查是否为终结阶段
   */
  isFinalPhase(phase: PhaseType): boolean {
    return phase === 'summary';
  }

  /**
   * 完成度检查（二次确认）
   */
  private async checkCompletion(
    sessionId: string,
    context: ReturnType<typeof contextManager.buildContext>
  ): Promise<CompletionCheckResult> {
    const { session, turns, values, insights } = context;

    // 构建检查prompt
    const prompt = COMPLETION_CHECK_PROMPT
      .replace('{question_title}', session.question_id)
      .replace('{turn_count}', String(turns.length))
      .replace('{values}', contextManager.formatValuesAsText(values))
      .replace('{insights}', contextManager.formatInsightsAsText(insights))
      .replace('{summary}', turns.slice(-3).map(t => t.user_message).join('\n'));

    try {
      const response = await ollamaService.generate(prompt, sessionId);
      const result = ollamaService.parseJsonResponse<{
        completion_score: number;
        dimensions: {
          breadth: number;
          depth: number;
          emotion: number;
          values: number;
        };
        missing_aspects: string[];
        recommendation: 'continue' | 'complete';
      }>(response, sessionId);

      return {
        completionScore: result.completion_score,
        dimensions: result.dimensions,
        missingAspects: result.missing_aspects || [],
        recommendation: result.recommendation
      };
    } catch (error) {
      logger.warn('phase', 'Completion check failed, using fallback', {
        session_id: sessionId,
        data: { error: String(error) }
      });

      // 降级：基于简单规则计算分数
      const valueScore = Math.min(25, values.length * 5);
      const turnScore = Math.min(25, turns.length * 2);
      const insightScore = Math.min(25, insights.length * 8);
      const baseScore = 25; // 基础分

      return {
        completionScore: valueScore + turnScore + insightScore + baseScore,
        dimensions: {
          breadth: turnScore,
          depth: insightScore,
          emotion: baseScore,
          values: valueScore
        },
        missingAspects: [],
        recommendation: 'complete'
      };
    }
  }

  /**
   * 获取GROW子阶段
   */
  getGrowSubPhase(sessionId: string): 'goal' | 'reality' | 'options' | 'way_forward' | null {
    const session = db.getSession(sessionId);
    if (!session || session.current_phase !== 'grow') {
      return null;
    }

    const goals = db.getSessionGoals(sessionId);
    if (goals.length === 0) {
      return 'goal';
    }

    const latestGoal = goals[goals.length - 1];

    if (!latestGoal.current_state) {
      return 'reality';
    }

    if (!latestGoal.option_selected) {
      return 'options';
    }

    if (!latestGoal.first_step) {
      return 'way_forward';
    }

    return null; // GROW完成
  }
}

export const phaseEvaluator = new PhaseEvaluator();
