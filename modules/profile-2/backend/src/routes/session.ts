/**
 * Profile-2 会话路由
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database.js';
import { contextManager } from '../services/context-manager.js';
import { questionGenerator } from '../services/question-generator.js';
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

  if (session.status === 'completed') {
    throw new AppError(
      ErrorCodes.SESSION_COMPLETED.code,
      ErrorCodes.SESSION_COMPLETED.message,
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
 * POST /api/session/:sessionId/complete
 * 手动完成会话（生成总结）
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

  if (session.status === 'completed') {
    res.json({
      success: true,
      message: '会话已完成',
      summary: session.final_summary
    });
    return;
  }

  // 生成最终总结
  const summary = await questionGenerator.generateFinalSummary(sessionId);

  res.json({
    success: true,
    message: '会话已完成',
    summary
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
