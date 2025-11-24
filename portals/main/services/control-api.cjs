/**
 * 服务控制 API
 * 管理各个后端服务的启动和停止
 *
 * Author: 壮爸
 * Date: 2025-11-24
 */

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = 3003; // 使用独立端口

// 中间件
app.use(cors());
app.use(express.json());

// 存储服务进程的Map
const serviceProcesses = new Map();

// 服务配置
const serviceConfigs = {
  'log-viewer': {
    name: '日志查看系统',
    cwd: path.join(__dirname, '../../../scripts/viewers/log-viewers/node-server'),
    command: 'npm',
    args: ['run', 'dev'],
    port: 55555
  },
  'profile': {
    name: '人物画像问答',
    cwd: path.join(__dirname, '../../../scripts/profile'),
    command: 'node',
    args: ['server.js'],
    port: 3002
  }
};

/**
 * 检查端口是否被占用
 */
function checkPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -an | findstr :${port}`, (err, stdout) => {
      if (err || !stdout) {
        resolve(false); // 端口未被占用
      } else {
        resolve(true); // 端口被占用
      }
    });
  });
}

/**
 * 启动服务
 */
app.post('/api/services/:serviceId/start', async (req, res) => {
  const { serviceId } = req.params;
  const config = serviceConfigs[serviceId];

  if (!config) {
    return res.status(404).json({ error: '未知服务' });
  }

  // 检查服务是否已经在运行
  if (serviceProcesses.has(serviceId)) {
    return res.json({
      status: 'already_running',
      message: '服务已在运行中'
    });
  }

  // 检查端口是否被占用
  const portInUse = await checkPort(config.port);
  if (portInUse) {
    return res.json({
      status: 'port_in_use',
      message: `端口 ${config.port} 已被占用，服务可能已通过其他方式启动`
    });
  }

  try {
    // 启动服务进程
    const serviceProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env }
    });

    // 存储进程引用
    serviceProcesses.set(serviceId, serviceProcess);

    // 监听进程退出
    serviceProcess.on('exit', (code, signal) => {
      console.log(`服务 ${serviceId} 退出: code=${code}, signal=${signal}`);
      serviceProcesses.delete(serviceId);
    });

    // 监听错误
    serviceProcess.on('error', (err) => {
      console.error(`服务 ${serviceId} 错误:`, err);
      serviceProcesses.delete(serviceId);
    });

    // 给服务一些时间启动
    setTimeout(() => {
      // 可以在这里检查服务是否真的启动成功
    }, 2000);

    res.json({
      status: 'started',
      message: `服务 ${config.name} 正在启动`
    });

  } catch (error) {
    console.error(`启动服务 ${serviceId} 失败:`, error);
    res.status(500).json({
      error: '启动服务失败',
      details: error.message
    });
  }
});

/**
 * 停止服务
 */
app.post('/api/services/:serviceId/stop', async (req, res) => {
  const { serviceId } = req.params;
  const config = serviceConfigs[serviceId];

  if (!config) {
    return res.status(404).json({ error: '未知服务' });
  }

  const serviceProcess = serviceProcesses.get(serviceId);

  if (!serviceProcess) {
    // 尝试通过端口查找并终止进程
    exec(`wmic process where "commandline like '%${config.port}%'" get processid`, (err, stdout) => {
      if (!err && stdout) {
        const lines = stdout.split('\n');
        const pids = lines
          .filter(line => line.trim() && !line.includes('ProcessId'))
          .map(line => line.trim());

        if (pids.length > 0) {
          pids.forEach(pid => {
            exec(`wmic process where processid=${pid} delete`, (err) => {
              if (!err) {
                console.log(`终止进程 PID ${pid}`);
              }
            });
          });
          return res.json({
            status: 'stopped',
            message: `服务 ${config.name} 已停止（通过端口查找）`
          });
        }
      }
    });

    return res.json({
      status: 'not_running',
      message: '服务未在运行中'
    });
  }

  try {
    // Windows 上使用 taskkill
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${serviceProcess.pid} /t /f`, (err) => {
        if (err) {
          console.error(`停止服务 ${serviceId} 失败:`, err);
        }
      });
    } else {
      serviceProcess.kill('SIGTERM');
    }

    serviceProcesses.delete(serviceId);

    res.json({
      status: 'stopped',
      message: `服务 ${config.name} 已停止`
    });

  } catch (error) {
    console.error(`停止服务 ${serviceId} 失败:`, error);
    res.status(500).json({
      error: '停止服务失败',
      details: error.message
    });
  }
});

/**
 * 获取所有服务状态
 */
app.get('/api/services/status', async (req, res) => {
  const statuses = {};

  for (const [serviceId, config] of Object.entries(serviceConfigs)) {
    const isRunning = serviceProcesses.has(serviceId);
    const portInUse = await checkPort(config.port);

    statuses[serviceId] = {
      name: config.name,
      port: config.port,
      processRunning: isRunning,
      portInUse: portInUse,
      status: portInUse ? 'online' : 'offline'
    };
  }

  res.json(statuses);
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'control-api',
    activeServices: Array.from(serviceProcesses.keys())
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🎮 服务控制 API 已启动`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`==================================================`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务控制 API...');

  // 停止所有管理的服务
  serviceProcesses.forEach((process, serviceId) => {
    console.log(`停止服务: ${serviceId}`);
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${process.pid} /t /f`);
    } else {
      process.kill('SIGTERM');
    }
  });

  process.exit(0);
});