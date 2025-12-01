/**
 * Profile-2 用户路由
 */

import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import { contextManager } from '../services/context-manager.js';
import { logger } from '../services/logger.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { AppError, ErrorCodes } from '../types.js';

const router = Router();

/**
 * GET /api/user/:userId/progress
 * 获取用户整体进度
 */
router.get('/:userId/progress', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const progress = contextManager.getUserOverallProgress(userId);
  const sessions = db.getUserSessions(userId);

  res.json({
    success: true,
    progress: {
      completed: progress.completed,
      in_progress: progress.inProgress,
      total: progress.total,
      completion_percent: Math.round((progress.completed / progress.total) * 100),
      completed_questions: progress.completedQuestions
    },
    sessions: sessions.map(s => ({
      session_id: s.session_id,
      question_id: s.question_id,
      question_order: s.question_order,
      status: s.status,
      total_turns: s.total_turns,
      started_at: s.started_at,
      completed_at: s.completed_at
    }))
  });
}));

/**
 * GET /api/user/:userId/values
 * 获取用户所有价值观
 */
router.get('/:userId/values', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const values = db.getUserValues(userId);

  // 按领域分组
  const byDomain: Record<string, Array<{
    value_id: number;
    value_name: string;
    depth_layer: number;
    user_confirmed: boolean | null;
    importance_rank: number | null;
    session_id: string;
  }>> = {};

  for (const v of values) {
    if (!byDomain[v.domain]) {
      byDomain[v.domain] = [];
    }
    byDomain[v.domain].push({
      value_id: v.value_id,
      value_name: v.value_name,
      depth_layer: v.depth_layer,
      user_confirmed: v.user_confirmed,
      importance_rank: v.importance_rank,
      session_id: v.session_id
    });
  }

  res.json({
    success: true,
    total: values.length,
    confirmed: values.filter(v => v.user_confirmed).length,
    by_domain: byDomain
  });
}));

/**
 * POST /api/user/:userId/values/:valueId/confirm
 * 确认价值观
 */
router.post('/:userId/values/:valueId/confirm', asyncHandler(async (req: Request, res: Response) => {
  const { valueId } = req.params;
  const { confirmed, importance_rank } = req.body;

  if (confirmed === undefined) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      '缺少确认状态',
      ErrorCodes.VALIDATION_ERROR.status
    );
  }

  db.confirmValue(Number(valueId), confirmed, importance_rank);

  logger.info('api', 'Value confirmed', {
    data: { value_id: valueId, confirmed, rank: importance_rank }
  });

  res.json({
    success: true,
    message: confirmed ? '价值观已确认' : '价值观已标记为不准确'
  });
}));

/**
 * GET /api/user/:userId/insights
 * 获取用户所有洞察
 */
router.get('/:userId/insights', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // 获取用户所有会话的洞察
  const sessions = db.getUserSessions(userId);
  const allInsights: Array<{
    insight_id: number;
    insight_type: string;
    content: string;
    status: string;
    session_id: string;
    question_id: string;
  }> = [];

  for (const session of sessions) {
    const insights = db.getSessionInsights(session.session_id);
    for (const ins of insights) {
      allInsights.push({
        insight_id: ins.insight_id,
        insight_type: ins.insight_type,
        content: ins.content,
        status: ins.status,
        session_id: session.session_id,
        question_id: session.question_id
      });
    }
  }

  res.json({
    success: true,
    total: allInsights.length,
    pending: allInsights.filter(i => i.status === 'pending').length,
    approved: allInsights.filter(i => i.status === 'approved').length,
    insights: allInsights
  });
}));

/**
 * POST /api/user/:userId/insights/:insightId/approve
 * 审批洞察
 */
router.post('/:userId/insights/:insightId/approve', asyncHandler(async (req: Request, res: Response) => {
  const { insightId } = req.params;
  const { approved_content } = req.body;

  if (!approved_content) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR.code,
      '缺少审批内容',
      ErrorCodes.VALIDATION_ERROR.status
    );
  }

  db.approveInsight(Number(insightId), approved_content);

  logger.info('api', 'Insight approved', {
    data: { insight_id: insightId }
  });

  res.json({
    success: true,
    message: '洞察已审批'
  });
}));

/**
 * GET /api/user/:userId/goals
 * 获取用户所有目标
 */
router.get('/:userId/goals', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const sessions = db.getUserSessions(userId);
  const allGoals: Array<{
    goal_id: number;
    goal_description: string;
    goal_type: string | null;
    status: string;
    first_step: string | null;
    commitment_level: number | null;
    session_id: string;
    question_id: string;
  }> = [];

  for (const session of sessions) {
    const goals = db.getSessionGoals(session.session_id);
    for (const g of goals) {
      allGoals.push({
        goal_id: g.goal_id,
        goal_description: g.goal_description,
        goal_type: g.goal_type,
        status: g.status,
        first_step: g.first_step,
        commitment_level: g.commitment_level,
        session_id: session.session_id,
        question_id: session.question_id
      });
    }
  }

  res.json({
    success: true,
    total: allGoals.length,
    active: allGoals.filter(g => g.status === 'active').length,
    goals: allGoals
  });
}));

export default router;
