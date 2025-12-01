/**
 * Profile-2 系统路由
 */

import { Router, Request, Response } from 'express';
import { ollamaService } from '../services/ollama-service.js';
import { logger, type LogLevel } from '../services/logger.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { getCurrentModel, setCurrentModel, config } from '../config.js';

const router = Router();

/**
 * GET /api/system/health
 * 健康检查
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const ollamaHealthy = await ollamaService.checkHealth();

  res.json({
    success: true,
    status: ollamaHealthy ? 'healthy' : 'degraded',
    services: {
      api: true,
      ollama: ollamaHealthy
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/system/models
 * 获取可用模型列表
 */
router.get('/models', asyncHandler(async (_req: Request, res: Response) => {
  const availableModels = await ollamaService.getAvailableModels();
  const currentModel = getCurrentModel();
  const configuredModels = config.ollama.availableModels;

  // 只返回配置中且实际可用的模型
  const models = configuredModels.filter(m => availableModels.includes(m));

  res.json({
    success: true,
    current_model: currentModel,
    available_models: models,
    all_ollama_models: availableModels
  });
}));

/**
 * POST /api/system/models
 * 切换模型
 */
router.post('/models', asyncHandler(async (req: Request, res: Response) => {
  const { model } = req.body;

  if (!model) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '缺少模型名称' }
    });
    return;
  }

  try {
    setCurrentModel(model);
    logger.info('api', `Model switched to: ${model}`);

    res.json({
      success: true,
      message: `模型已切换为: ${model}`,
      current_model: model
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_MODEL', message: String(error) }
    });
  }
}));

/**
 * GET /api/system/config
 * 获取系统配置（非敏感）
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    config: {
      ports: config.ports,
      features: config.features,
      ollama: {
        baseUrl: config.ollama.baseUrl,
        defaultModel: config.ollama.defaultModel,
        availableModels: config.ollama.availableModels
      }
    }
  });
});

/**
 * POST /api/system/log-level
 * 设置日志级别
 */
router.post('/log-level', (req: Request, res: Response) => {
  const { level } = req.body;

  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!validLevels.includes(level)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_LOG_LEVEL',
        message: `无效的日志级别，可选: ${validLevels.join(', ')}`
      }
    });
    return;
  }

  logger.setLevel(level);

  res.json({
    success: true,
    message: `日志级别已设置为: ${level}`,
    current_level: level
  });
});

/**
 * GET /api/system/log-level
 * 获取当前日志级别
 */
router.get('/log-level', (_req: Request, res: Response) => {
  res.json({
    success: true,
    level: logger.getLevel()
  });
});

export default router;
