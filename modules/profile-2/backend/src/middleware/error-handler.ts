/**
 * Profile-2 错误处理中间件
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.js';
import { AppError } from '../types.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const sessionId = req.body?.session_id;

  logger.error('api', err.message, {
    session_id: sessionId,
    data: {
      path: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });

  // AppError - 已知错误
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.userMessage,
        details: process.env.NODE_ENV === 'development' ? err.details : undefined
      }
    });
    return;
  }

  // 未知错误
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试'
    }
  });
}

// 404处理
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `API端点不存在: ${req.method} ${req.path}`
    }
  });
}

// 异步包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
