/**
 * Profile-2 会话路由
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database.js';
import { contextManager } from '../services/context-manager.js';
import { questionGenerator } from '../services/question-generator.js';
import { summaryGenerator } from '../services/summary-generator.js';
import { logger } from '../services/logger.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { getPhaseOrder, getQuestionStrategy } from '../config.js';
import { AppError, ErrorCodes } from '../types.js';
import type { PhaseType } from '../types.js';

const router = Router();

/**
 * POST /api/session/start
 * 开始新会话或恢复已有会话
 */
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const { user_id, question_id, question_order, initial_answer, force_new } = req.body;

  if (!user_id || !question_id || question_order === undefined || !initial_answer) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      '缺少必要参数',
      ErrorCodes.VALIDATION_ERROR.status,
      { required: ['user_id', 'question_id', 'question_order', 'initial_answer'] }
    );
  }

  // 确保用户存在
  db.ensureUser(user_id);

  // 检查是否有活跃会话
  const existingSession = db.getActiveSession(user_id, question_id);

  if (existingSession && !force_new) {
    // 返回已有会话，让前端决定是否覆盖
    logger.info('api', 'Existing session found', {
      session_id: existingSession.session_id,
      data: { question_id, status: existingSession.status }
    });

    res.json({
      success: true,
      action: 'existing_found',
      session: {
        session_id: existingSession.session_id,
        status: existingSession.status,
        total_turns: existingSession.total_turns,
        current_phase: existingSession.current_phase,
        started_at: existingSession.started_at
      },
      message: '发现已有会话记录，是否继续或重新开始？'
    });
    return;
  }

  // 如果强制新建且有旧会话，归档旧会话
  if (existingSession && force_new) {
    db.archiveSession(existingSession.session_id, 'user_restart');
  }

  // 创建新会话
  const sessionId = uuidv4();
  const strategy = getQuestionStrategy(question_id);
  const phaseOrder = getPhaseOrder(question_id);
  const initialPhase = phaseOrder[0];

  db.createSession({
    sessionId,
    userId: user_id,
    questionId: question_id,
    questionOrder: question_order,
    initialAnswer: initial_answer,
    phaseConfig: JSON.stringify(strategy),
    initialPhase
  });

  // 记录初始阶段转换
  db.recordTransition({
    sessionId,
    fromPhase: null,
    toPhase: initialPhase,
    reasons: 'session_start',
    turnNumber: 0
  });

  logger.info('api', 'New session created', {
    session_id: sessionId,
    data: { question_id, initial_phase: initialPhase }
  });

  res.json({
    success: true,
    action: 'created',
    session: {
      session_id: sessionId,
      question_id,
      current_phase: initialPhase,
      phase_order: phaseOrder
    }
  });
}));

/**
 * POST /api/session/message
 * 发送消息并获取AI回复
 */
router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  const { session_id, message } = req.body;

  if (!session_id || !message) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      '缺少必要参数',
      ErrorCodes.VALIDATION_ERROR.status,
      { required: ['session_id', 'message'] }
    );
  }

  const session = db.getSession(session_id);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  // 已完成/已确认/已拒绝/待确认的会话都不能继续对话
  if (['completed', 'pending_approval', 'approved', 'rejected'].includes(session.status)) {
    throw new AppError(
      ErrorCodes.SESSION_COMPLETED.code,
      session.status === 'pending_approval'
        ? '会话已生成总结，等待确认'
        : ErrorCodes.SESSION_COMPLETED.message,
      ErrorCodes.SESSION_COMPLETED.status
    );
  }

  // 生成AI回复
  const result = await questionGenerator.generate(session_id, message);

  // 获取更新后的进度
  const progress = contextManager.calculatePhaseProgress(session_id);

  res.json({
    success: true,
    response: result.response,
    turn_number: result.turnNumber,
    phase: result.phase,
    phase_transition: result.phaseTransition,
    is_complete: result.isComplete || false,
    requires_approval: result.requiresApproval || false,
    requires_summary: result.requiresSummary || false,  // 需要调用 summary API
    progress: {
      current_phase: progress.currentPhase,
      phase_index: progress.phaseIndex,
      total_phases: progress.totalPhases,
      progress_percent: progress.progressPercent
    }
  });
}));

/**
 * GET /api/session/:sessionId
 * 获取会话详情
 */
router.get('/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  const turns = db.getSessionTurns(sessionId);
  const values = db.getSessionValues(sessionId);
  const stats = db.getSessionStats(sessionId);
  const progress = contextManager.calculatePhaseProgress(sessionId);

  res.json({
    success: true,
    session: {
      ...session,
      turns,
      values,
      stats,
      progress
    }
  });
}));

/**
 * POST /api/session/:sessionId/summary
 * 生成会话总结（独立流程，不自动入库）
 */
router.post('/:sessionId/summary', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  // 检查状态
  if (['approved', 'rejected'].includes(session.status)) {
    throw new AppError(
      ErrorCodes.SESSION_COMPLETED.code,
      session.status === 'approved' ? '会话已确认入库' : '会话已拒绝入库',
      ErrorCodes.SESSION_COMPLETED.status
    );
  }

  // 如果已有待确认的总结，直接返回
  if (session.status === 'pending_approval' && session.final_summary) {
    res.json({
      success: true,
      summary: session.final_summary,
      status: 'pending_approval',
      requires_approval: true
    });
    return;
  }

  // 使用独立的 summaryGenerator 生成总结
  const result = await summaryGenerator.generate(sessionId);

  // 保存总结到 pending_approval 状态
  summaryGenerator.savePending(sessionId, result.summary);

  logger.info('api', 'Summary generated', {
    session_id: sessionId,
    data: {
      isEnhanced: result.isEnhanced,
      insightCount: result.keyInsights.length
    }
  });

  res.json({
    success: true,
    summary: result.summary,
    key_insights: result.keyInsights,
    values_discovered: result.valuesDiscovered,
    action_items: result.actionItems,
    is_enhanced: result.isEnhanced,
    status: 'pending_approval',
    requires_approval: true
  });
}));

/**
 * POST /api/session/:sessionId/complete
 * 手动完成会话（生成总结）- 兼容旧 API
 */
router.post('/:sessionId/complete', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  // 已完成的各种状态
  if (['completed', 'pending_approval', 'approved', 'rejected'].includes(session.status)) {
    res.json({
      success: true,
      message: session.status === 'pending_approval'
        ? '等待用户确认入库'
        : session.status === 'approved'
        ? '已确认入库'
        : session.status === 'rejected'
        ? '已拒绝入库'
        : '会话已完成',
      summary: session.final_summary,
      status: session.status,
      requires_approval: session.status === 'pending_approval'
    });
    return;
  }

  // 使用独立的 summaryGenerator 生成总结
  const result = await summaryGenerator.generate(sessionId);
  summaryGenerator.savePending(sessionId, result.summary);

  res.json({
    success: true,
    message: '已生成总结，请确认是否入库',
    summary: result.summary,
    status: 'pending_approval',
    requires_approval: true
  });
}));

/**
 * POST /api/session/:sessionId/approve
 * 用户确认入库
 */
router.post('/:sessionId/approve', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  if (session.status !== 'pending_approval') {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      `会话状态不正确：期望 pending_approval，实际 ${session.status}`,
      ErrorCodes.VALIDATION_ERROR.status
    );
  }

  // 确认入库
  db.approveSession(sessionId);

  // TODO: 触发 RAG 同步（如果启用）
  // if (isRagSyncEnabled()) {
  //   ragSyncService.syncSession(sessionId);
  // }

  logger.info('api', 'Session approved', { session_id: sessionId });

  res.json({
    success: true,
    message: '已确认入库',
    session_id: sessionId,
    status: 'approved'
  });
}));

/**
 * POST /api/session/:sessionId/reject
 * 用户拒绝入库
 */
router.post('/:sessionId/reject', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { reason } = req.body;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  if (session.status !== 'pending_approval') {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      `会话状态不正确：期望 pending_approval，实际 ${session.status}`,
      ErrorCodes.VALIDATION_ERROR.status
    );
  }

  // 拒绝入库
  db.rejectSession(sessionId, reason);

  logger.info('api', 'Session rejected', {
    session_id: sessionId,
    data: { reason }
  });

  res.json({
    success: true,
    message: '已拒绝入库',
    session_id: sessionId,
    status: 'rejected'
  });
}));

/**
 * GET /api/session/:sessionId/history
 * 获取对话历史
 */
router.get('/:sessionId/history', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = db.getSession(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCodes.SESSION_NOT_FOUND.code,
      ErrorCodes.SESSION_NOT_FOUND.message,
      ErrorCodes.SESSION_NOT_FOUND.status
    );
  }

  const turns = db.getSessionTurns(sessionId);
  const transitions = db.getSessionTransitions(sessionId);

  res.json({
    success: true,
    history: {
      initial_answer: session.initial_answer,
      turns: turns.map(t => ({
        turn_number: t.turn_number,
        phase: t.phase,
        user_message: t.user_message,
        ai_message: t.ai_message,
        created_at: t.created_at
      })),
      transitions: transitions.map(t => ({
        from: t.from_phase,
        to: t.to_phase,
        turn: t.turn_number,
        timestamp: t.timestamp
      }))
    }
  });
}));

export default router;
