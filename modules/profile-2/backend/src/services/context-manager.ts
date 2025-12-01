/**
 * Profile-2 上下文管理器
 * 管理对话上下文，构建AI所需的信息
 */

import { db } from './database.js';
import { logger } from './logger.js';
import { getQuestionStrategy, getPhaseOrder } from '../config.js';
import type {
  Session,
  Turn,
  Value,
  Insight,
  Goal,
  PhaseType,
  ConversationContext
} from '../types.js';

class ContextManager {
  /**
   * 构建完整的对话上下文
   */
  buildContext(sessionId: string): ConversationContext {
    const session = db.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const turns = db.getSessionTurns(sessionId);
    const values = db.getSessionValues(sessionId);
    const insights = db.getSessionInsights(sessionId);
    const goals = db.getSessionGoals(sessionId);
    const stats = db.getSessionStats(sessionId);

    const strategy = getQuestionStrategy(session.question_id);
    const phaseOrder = getPhaseOrder(session.question_id);

    logger.debug('context', 'Context built', {
      session_id: sessionId,
      data: {
        turns: stats.turnCount,
        values: stats.valueCount,
        phase: session.current_phase
      }
    });

    return {
      session,
      turns,
      values,
      insights,
      goals,
      stats,
      strategy,
      phaseOrder,
      currentPhaseIndex: phaseOrder.indexOf(session.current_phase as PhaseType)
    };
  }

  /**
   * 获取最近N轮对话
   */
  getRecentTurns(sessionId: string, count: number = 5): Turn[] {
    const turns = db.getSessionTurns(sessionId);
    return turns.slice(-count);
  }

  /**
   * 获取当前阶段的对话
   */
  getCurrentPhaseTurns(sessionId: string): Turn[] {
    const session = db.getSession(sessionId);
    if (!session) return [];

    return db.getPhaseTurns(sessionId, session.current_phase as PhaseType);
  }

  /**
   * 构建对话历史文本
   */
  formatTurnsAsText(turns: Turn[]): string {
    return turns.map(t =>
      `[轮次${t.turn_number}] 用户: ${t.user_message}\nAI: ${t.ai_message}`
    ).join('\n\n');
  }

  /**
   * 构建价值观摘要
   */
  formatValuesAsText(values: Value[]): string {
    if (values.length === 0) return '暂未发现明确价值观';

    const byDomain: Record<string, Value[]> = {};
    for (const v of values) {
      if (!byDomain[v.domain]) byDomain[v.domain] = [];
      byDomain[v.domain].push(v);
    }

    const lines: string[] = [];
    for (const [domain, vals] of Object.entries(byDomain)) {
      lines.push(`【${domain}】`);
      for (const v of vals) {
        const confirmed = v.user_confirmed ? '✓' : '?';
        lines.push(`  ${confirmed} ${v.value_name} (深度${v.depth_layer})`);
        if (v.evidence_quote) {
          lines.push(`    证据: "${v.evidence_quote.slice(0, 50)}..."`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 构建洞察摘要
   */
  formatInsightsAsText(insights: Insight[]): string {
    if (insights.length === 0) return '暂无洞察';

    return insights.map((ins, i) =>
      `${i + 1}. [${ins.insight_type}] ${ins.content}`
    ).join('\n');
  }

  /**
   * 构建目标摘要
   */
  formatGoalsAsText(goals: Goal[]): string {
    if (goals.length === 0) return '暂无目标';

    return goals.map((g, i) => {
      const lines = [`${i + 1}. ${g.goal_description}`];
      if (g.current_state) lines.push(`   现状: ${g.current_state}`);
      if (g.first_step) lines.push(`   第一步: ${g.first_step}`);
      if (g.commitment_level) lines.push(`   承诺度: ${g.commitment_level}/10`);
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * 获取阶段配置信息
   */
  getPhaseConfigText(session: Session): string {
    const strategy = getQuestionStrategy(session.question_id);
    if (!strategy) return '默认策略';

    const lines = [
      `问题ID: ${session.question_id}`,
      `轮次范围: ${strategy.minTurns}-${strategy.maxTurns}`,
      `阶段序列: ${getPhaseOrder(session.question_id).join(' → ')}`
    ];

    if (strategy.specialMode) {
      lines.push(`特殊模式: ${strategy.specialMode}`);
    }

    return lines.join('\n');
  }

  /**
   * 计算阶段进度
   */
  calculatePhaseProgress(sessionId: string): {
    currentPhase: PhaseType;
    phaseIndex: number;
    totalPhases: number;
    phaseTurnCount: number;
    totalTurnCount: number;
    progressPercent: number;
  } {
    const session = db.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const phaseOrder = getPhaseOrder(session.question_id);
    const currentPhase = session.current_phase as PhaseType;
    const phaseIndex = phaseOrder.indexOf(currentPhase);
    const phaseTurns = db.getPhaseTurns(sessionId, currentPhase);
    const allTurns = db.getSessionTurns(sessionId);

    const strategy = getQuestionStrategy(session.question_id);
    const maxTurns = strategy?.maxTurns || 20;

    return {
      currentPhase,
      phaseIndex,
      totalPhases: phaseOrder.length,
      phaseTurnCount: phaseTurns.length,
      totalTurnCount: allTurns.length,
      progressPercent: Math.min(100, Math.round((allTurns.length / maxTurns) * 100))
    };
  }

  /**
   * 获取用户的所有历史价值观（跨问题）
   */
  getUserHistoricalValues(userId: string): Value[] {
    return db.getUserValues(userId);
  }

  /**
   * 检查是否有未完成的会话
   */
  hasActiveSession(userId: string, questionId: string): boolean {
    const session = db.getActiveSession(userId, questionId);
    return session !== null && session.status === 'in_progress';
  }

  /**
   * 获取用户整体进度
   */
  getUserOverallProgress(userId: string): {
    completed: number;
    inProgress: number;
    total: number;
    completedQuestions: string[];
  } {
    const progress = db.getUserProgress(userId);
    const completed = progress.filter(p => p.status === 'completed');
    const inProgress = progress.filter(p => p.status === 'in_progress');

    return {
      completed: completed.length,
      inProgress: inProgress.length,
      total: 8, // 固定8个问题
      completedQuestions: completed.map(p => p.questionId)
    };
  }
}

export const contextManager = new ContextManager();
