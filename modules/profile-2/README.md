# Profile-2 个人画像系统 V2

基于 DICE + GROW + ACT 理论的深度访谈问答系统。

## 特性

- **四阶段按需组合**: Opening → Values-Based Narrative → Deep Exploration → GROW → Summary
- **问题级策略定制**: 8个问题各自使用不同的阶段组合
- **职责分离架构**: 追问生成器 + 阶段判断器 独立运行
- **数据覆盖保护**: 版本管理 + 确认机制
- **会话恢复**: 支持断线续聊
- **RAG就绪**: 审批后自动同步到向量库
- **Pip-Boy主题**: 磷光绿 CRT 效果

## 快速开始

```bash
# 1. 安装依赖（在项目根目录）
pnpm install

# 2. 初始化数据库
cd modules/profile-2/backend
pnpm migrate

# 3. 启动服务
cd modules/profile-2
./start.cmd
```

## 端口分配

| 服务 | 端口 |
|------|------|
| Frontend | 3002 |
| Backend | 3102 |

## 目录结构

```
profile-2/
├── backend/                      # Express + TypeScript 后端
│   └── src/
│       ├── services/
│       │   ├── database.ts       # 数据库操作
│       │   ├── ollama-service.ts # Ollama API
│       │   ├── context-manager.ts # 上下文管理
│       │   ├── phase-evaluator.ts # 阶段判断器
│       │   ├── question-generator.ts # 追问生成器
│       │   └── logger.ts         # 日志服务
│       ├── prompts/
│       │   ├── system-prompts.ts # 各阶段提示词
│       │   └── phase-evaluation.ts # 阶段评估提示
│       ├── routes/
│       │   ├── session.ts        # 会话API
│       │   ├── user.ts           # 用户API
│       │   └── system.ts         # 系统API
│       ├── middleware/
│       │   └── error-handler.ts  # 错误处理
│       ├── config.ts             # 配置管理
│       ├── types.ts              # 类型定义
│       ├── migrate.ts            # 数据库迁移
│       └── server.ts             # 入口
│
├── frontend/                     # React + TypeScript 前端
│   └── src/
│       ├── pages/
│       │   ├── QuestionList.tsx  # 问题列表
│       │   └── Interview.tsx     # 访谈对话
│       ├── api/
│       │   └── client.ts         # API客户端
│       ├── types.ts              # 类型定义
│       ├── constants.ts          # 常量配置
│       ├── index.css             # Pip-Boy样式
│       ├── App.tsx               # 路由
│       └── main.tsx              # 入口
│
├── data/                         # SQLite 数据库目录
├── config.json                   # 模块配置
├── start.cmd                     # 启动脚本
├── stop.cmd                      # 停止脚本
└── README.md
```

## 数据库结构（8表）

1. **users** - 用户表
2. **sessions** - 会话表（含版本管理）
3. **turns** - 对话轮次表
4. **values** - 价值观表
5. **insights** - 洞察表
6. **goals** - 目标表（GROW）
7. **rag_sync_queue** - RAG同步队列
8. **phase_transitions** - 阶段转换记录

## API 端点

### 会话管理
- `POST /api/session/start` - 开始/恢复会话
- `POST /api/session/message` - 发送消息
- `GET /api/session/:id` - 获取会话详情
- `POST /api/session/:id/complete` - 完成会话

### 用户数据
- `GET /api/user/:id/progress` - 获取进度
- `GET /api/user/:id/values` - 获取价值观
- `GET /api/user/:id/insights` - 获取洞察
- `GET /api/user/:id/goals` - 获取目标

### 系统
- `GET /api/system/health` - 健康检查
- `GET /api/system/models` - 可用模型
- `POST /api/system/models` - 切换模型

## 与 V1 的差异

| 维度 | V1 | V2 |
|------|----|----|
| 阶段设计 | 五阶段固定流程 | 四阶段按需组合 |
| Opening | 每个问题都有 | 仅问题1 |
| GROW | 所有问题 | 问题级预设（仅2、6题） |
| 数据保护 | 直接覆盖 | 版本管理+确认 |
| 数据库 | 3表 | 8表 SQL友好 |
| 日志 | 文件 | 仅控制台 |

## 理论基础

- **DICE技术**: Descriptive, Idiographic, Clarifying, Explanatory 追问类型
- **GROW模型**: Goal, Reality, Options, Way Forward 目标辅导
- **ACT价值观**: Acceptance and Commitment Therapy 价值观澄清

## 文档

- [实施文档](./research/Profile-2实施文档.md)
- [理论研究](./research/五阶段问卷设计理论基础研究报告.md)

---

**维护者**: 壮爸 | **版本**: 2.0.0
