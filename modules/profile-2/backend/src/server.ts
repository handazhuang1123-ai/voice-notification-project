/**
 * Profile-2 Express 服务器
 * 个人画像问答系统后端
 */

import express from 'express';
import cors from 'cors';
import { getBackendPort, config } from './config.js';
import { logger } from './services/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import routes from './routes/index.js';

const app = express();
const PORT = getBackendPort();

// ============ 中间件 ============

// CORS配置
app.use(cors({
  origin: [
    `http://localhost:${config.ports.frontend}`,
    'http://localhost:3000', // 主门户
    'http://127.0.0.1:3002'
  ],
  credentials: true
}));

// JSON解析
app.use(express.json({ limit: '1mb' }));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const sessionId = req.body?.session_id;

    // 只记录API请求，跳过健康检查
    if (!req.path.includes('/health')) {
      logger.info('api', `${req.method} ${req.path} ${res.statusCode}`, {
        session_id: sessionId,
        duration_ms: duration
      });
    }
  });

  next();
});

// ============ 路由 ============

// API路由
app.use('/api', routes);

// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'Profile-2 API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      session: '/api/session/*',
      user: '/api/user/*',
      system: '/api/system/*'
    }
  });
});

// ============ 错误处理 ============

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// ============ 启动服务器 ============

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Profile-2 Backend Server');
  console.log('========================================');
  console.log(`  Port: ${PORT}`);
  console.log(`  Ollama: ${config.ollama.baseUrl}`);
  console.log(`  Model: ${config.ollama.defaultModel}`);
  console.log('----------------------------------------');
  console.log('  API Endpoints:');
  console.log('    POST /api/session/start');
  console.log('    POST /api/session/message');
  console.log('    GET  /api/session/:id');
  console.log('    GET  /api/user/:id/progress');
  console.log('    GET  /api/system/health');
  console.log('========================================');
  console.log('');

  logger.info('api', `Server started on port ${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('api', 'Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('api', 'Shutting down...');
  process.exit(0);
});

export default app;
