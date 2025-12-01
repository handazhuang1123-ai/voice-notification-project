/**
 * Profile-2 数据库服务
 * 基于better-sqlite3的数据库操作封装
 */

import Database from 'better-sqlite3';
import { getDatabasePath } from '../config.js';
import { logger } from './logger.js';
import type {
  Session,
  Turn,
  Value,
  Insight,
  Goal,
  PhaseTransition,
  RagSyncQueueItem,
  PhaseType
} from '../types.js';

/** 获取北京时间 ISO 8601 格式 (带时区偏移) */
function getBeijingTime(): string {
  const now = new Date();
  const offset = 8 * 60; // UTC+8
  const beijing = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  const y = beijing.getFullYear();
  const mo = String(beijing.getMonth() + 1).padStart(2, '0');
  const d = String(beijing.getDate()).padStart(2, '0');
  const h = String(beijing.getHours()).padStart(2, '0');
  const m = String(beijing.getMinutes()).padStart(2, '0');
  const s = String(beijing.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${m}:${s}+08:00`;
}

class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbPath = getDatabasePath();
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    logger.info('db', `Database connected: ${dbPath}`);
  }

  /** 获取北京时间用于 SQL */
  private now(): string {
    return getBeijingTime();
  }

  // ============ Users ============

  ensureUser(userId: string, nickname?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (user_id, nickname, last_active_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET last_active_at = ?
    `);
    const now = this.now();
    stmt.run(userId, nickname || null, now, now);
  }

  // ============ Sessions ============

  createSession(params: {
    sessionId: string;
    userId: string;
    questionId: string;
    questionOrder: number;
    initialAnswer: string;
    phaseConfig: string;
    initialPhase: PhaseType;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        session_id, user_id, question_id, question_order,
        initial_answer, phase_config, current_phase, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress')
    `);
    stmt.run(
      params.sessionId,
      params.userId,
      params.questionId,
      params.questionOrder,
      params.initialAnswer,
      params.phaseConfig,
      params.initialPhase
    );

    logger.info('db', 'Session created', {
      session_id: params.sessionId,
      data: { question_id: params.questionId, phase: params.initialPhase }
    });
  }

  getSession(sessionId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE session_id = ?
    `);
    const row = stmt.get(sessionId) as Session | undefined;
    return row || null;
  }

  getActiveSession(userId: string, questionId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND question_id = ? AND is_active = TRUE
      ORDER BY started_at DESC
      LIMIT 1
    `);
    const row = stmt.get(userId, questionId) as Session | undefined;
    return row || null;
  }

  getUserSessions(userId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY question_order ASC
    `);
    return stmt.all(userId) as Session[];
  }

  updateSessionPhase(sessionId: string, phase: PhaseType): void {
    const stmt = this.db.prepare(`
      UPDATE sessions SET current_phase = ? WHERE session_id = ?
    `);
    stmt.run(phase, sessionId);
  }

  updateSessionTurnCount(sessionId: string, turnCount: number): void {
    const stmt = this.db.prepare(`
      UPDATE sessions SET total_turns = ? WHERE session_id = ?
    `);
    stmt.run(turnCount, sessionId);
  }

  completeSession(sessionId: string, finalSummary: string): void {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET status = 'completed', final_summary = ?, completed_at = ?
      WHERE session_id = ?
    `);
    stmt.run(finalSummary, this.now(), sessionId);

    logger.info('db', 'Session completed', { session_id: sessionId });
  }

  archiveSession(sessionId: string, reason: string): void {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET is_active = FALSE, archived_at = ?, archived_reason = ?
      WHERE session_id = ?
    `);
    stmt.run(this.now(), reason, sessionId);

    logger.info('db', 'Session archived', {
      session_id: sessionId,
      data: { reason }
    });
  }

  // ============ Turns ============

  addTurn(params: {
    sessionId: string;
    turnNumber: number;
    phase: PhaseType;
    userMessage: string;
    aiMessage: string;
    probeType?: string;
    aiReasoning?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO turns (
        session_id, turn_number, phase,
        user_message, ai_message, probe_type, ai_reasoning
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.sessionId,
      params.turnNumber,
      params.phase,
      params.userMessage,
      params.aiMessage,
      params.probeType || null,
      params.aiReasoning || null
    );

    return result.lastInsertRowid as number;
  }

  getSessionTurns(sessionId: string): Turn[] {
    const stmt = this.db.prepare(`
      SELECT * FROM turns WHERE session_id = ? ORDER BY turn_number ASC
    `);
    return stmt.all(sessionId) as Turn[];
  }

  getPhaseTurns(sessionId: string, phase: PhaseType): Turn[] {
    const stmt = this.db.prepare(`
      SELECT * FROM turns
      WHERE session_id = ? AND phase = ?
      ORDER BY turn_number ASC
    `);
    return stmt.all(sessionId, phase) as Turn[];
  }

  // ============ Values ============

  addValue(params: {
    userId: string;
    sessionId: string;
    domain: string;
    valueName: string;
    depthLayer: number;
    evidenceQuote?: string;
    evidenceTurnId?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO "values" (
        user_id, session_id, domain, value_name,
        depth_layer, evidence_quote, evidence_turn_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.userId,
      params.sessionId,
      params.domain,
      params.valueName,
      params.depthLayer,
      params.evidenceQuote || null,
      params.evidenceTurnId || null
    );

    logger.debug('db', 'Value added', {
      session_id: params.sessionId,
      data: { domain: params.domain, value: params.valueName }
    });

    return result.lastInsertRowid as number;
  }

  getUserValues(userId: string): Value[] {
    const stmt = this.db.prepare(`
      SELECT * FROM "values"
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId) as Value[];
  }

  getSessionValues(sessionId: string): Value[] {
    const stmt = this.db.prepare(`
      SELECT * FROM "values"
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as Value[];
  }

  confirmValue(valueId: number, confirmed: boolean, rank?: number): void {
    const stmt = this.db.prepare(`
      UPDATE "values"
      SET user_confirmed = ?, importance_rank = ?, updated_at = ?
      WHERE value_id = ?
    `);
    stmt.run(confirmed ? 1 : 0, rank || null, this.now(), valueId);
  }

  // ============ Insights ============

  addInsight(params: {
    userId: string;
    sessionId: string;
    insightType: string;
    content: string;
    sourcePhase?: string;
    sourceTurnId?: number;
    triggerQuote?: string;
    relatedValueId?: number;
    relatedGoalId?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO insights (
        user_id, session_id, insight_type, content,
        source_phase, source_turn_id, trigger_quote,
        related_value_id, related_goal_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.userId,
      params.sessionId,
      params.insightType,
      params.content,
      params.sourcePhase || null,
      params.sourceTurnId || null,
      params.triggerQuote || null,
      params.relatedValueId || null,
      params.relatedGoalId || null
    );

    logger.debug('db', 'Insight added', {
      session_id: params.sessionId,
      data: { type: params.insightType }
    });

    return result.lastInsertRowid as number;
  }

  getSessionInsights(sessionId: string): Insight[] {
    const stmt = this.db.prepare(`
      SELECT * FROM insights WHERE session_id = ? ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as Insight[];
  }

  approveInsight(insightId: number, approvedContent: string): void {
    const stmt = this.db.prepare(`
      UPDATE insights
      SET status = 'approved', approved_content = ?
      WHERE insight_id = ?
    `);
    stmt.run(approvedContent, insightId);
  }

  // ============ Goals ============

  addGoal(params: {
    userId: string;
    sessionId: string;
    goalDescription: string;
    goalType?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO goals (user_id, session_id, goal_description, goal_type)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.userId,
      params.sessionId,
      params.goalDescription,
      params.goalType || null
    );

    logger.debug('db', 'Goal added', {
      session_id: params.sessionId,
      data: { description: params.goalDescription.slice(0, 50) }
    });

    return result.lastInsertRowid as number;
  }

  updateGoalGROW(goalId: number, updates: Partial<Goal>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedFields = [
      'smart_specific', 'smart_measurable', 'smart_achievable',
      'smart_relevant', 'smart_time_bound', 'importance_score',
      'current_state', 'obstacles', 'reality_aha_moment',
      'options_generated', 'option_selected', 'selection_reason',
      'action_steps', 'first_step', 'commitment_level'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = ?`);
        values.push((updates as Record<string, unknown>)[field]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(this.now());
    values.push(goalId);

    const stmt = this.db.prepare(`
      UPDATE goals SET ${fields.join(', ')} WHERE goal_id = ?
    `);
    stmt.run(...values);
  }

  getSessionGoals(sessionId: string): Goal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM goals WHERE session_id = ? ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as Goal[];
  }

  // ============ Phase Transitions ============

  recordTransition(params: {
    sessionId: string;
    fromPhase: PhaseType | null;
    toPhase: PhaseType;
    reasons?: string;
    evaluationData?: string;
    turnNumber: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO phase_transitions (
        session_id, from_phase, to_phase,
        transition_reasons, evaluation_data, turn_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.sessionId,
      params.fromPhase,
      params.toPhase,
      params.reasons || null,
      params.evaluationData || null,
      params.turnNumber
    );

    logger.info('phase', `Transition: ${params.fromPhase || 'start'} → ${params.toPhase}`, {
      session_id: params.sessionId,
      data: { turn: params.turnNumber }
    });
  }

  getSessionTransitions(sessionId: string): PhaseTransition[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phase_transitions
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(sessionId) as PhaseTransition[];
  }

  // ============ RAG Sync Queue ============

  addToRagQueue(params: {
    sourceTable: string;
    sourceId: number;
    contentText: string;
    contentType: string;
    userId: string;
    metadata: Record<string, unknown>;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO rag_sync_queue (
        source_table, source_id, content_text,
        content_type, user_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.sourceTable,
      params.sourceId,
      params.contentText,
      params.contentType,
      params.userId,
      JSON.stringify(params.metadata)
    );

    logger.debug('rag', 'Added to sync queue', {
      data: { table: params.sourceTable, id: params.sourceId }
    });
  }

  getPendingRagItems(limit: number = 10): RagSyncQueueItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM rag_sync_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit) as RagSyncQueueItem[];
  }

  updateRagItemStatus(queueId: number, status: string, embeddingId?: string, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE rag_sync_queue
      SET status = ?, embedding_id = ?, error_message = ?, processed_at = ?
      WHERE queue_id = ?
    `);
    stmt.run(status, embeddingId || null, error || null, this.now(), queueId);
  }

  // ============ Statistics ============

  getSessionStats(sessionId: string): {
    turnCount: number;
    valueCount: number;
    insightCount: number;
    goalCount: number;
  } {
    const turns = this.db.prepare('SELECT COUNT(*) as count FROM turns WHERE session_id = ?').get(sessionId) as { count: number };
    const values = this.db.prepare('SELECT COUNT(*) as count FROM "values" WHERE session_id = ?').get(sessionId) as { count: number };
    const insights = this.db.prepare('SELECT COUNT(*) as count FROM insights WHERE session_id = ?').get(sessionId) as { count: number };
    const goals = this.db.prepare('SELECT COUNT(*) as count FROM goals WHERE session_id = ?').get(sessionId) as { count: number };

    return {
      turnCount: turns.count,
      valueCount: values.count,
      insightCount: insights.count,
      goalCount: goals.count
    };
  }

  getUserProgress(userId: string): Array<{
    questionId: string;
    status: string;
    completedAt: string | null;
  }> {
    const stmt = this.db.prepare(`
      SELECT question_id, status, completed_at
      FROM sessions
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY question_order ASC
    `);
    return stmt.all(userId) as Array<{
      questionId: string;
      status: string;
      completedAt: string | null;
    }>;
  }

  // ============ Utility ============

  close(): void {
    this.db.close();
    logger.info('db', 'Database connection closed');
  }
}

export const db = new DatabaseService();
