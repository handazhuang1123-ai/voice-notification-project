# Profile Module

> Phase 2.1 个人画像问卷系统 - 基于三阶段访谈框架的个人历史画像深度采集系统

## 目录结构

```
profile/
├── backend/           # TypeScript + Express 后端
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── migrate.ts
│   │   └── services/
│   │       └── ollama-service.ts
│   └── package.json
│
├── frontend/          # React + TypeScript 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── data/              # 数据文件
│   └── profile.db
│
├── config.json        # 模块配置
├── start.cmd          # 后台启动脚本
├── start-debug.cmd    # 调试模式启动
├── start-hidden.vbs   # 隐藏窗口启动
├── stop.cmd           # 停止服务脚本
└── README.md
```

## 快速启动

### Windows 快捷方式（推荐）

```bash
# 后台模式启动（自动启动前后端）
双击 start.cmd

# 调试模式（打开控制台查看日志）
双击 start-debug.cmd

# 停止所有服务
双击 stop.cmd
```

### 手动启动

```bash
# 后端开发模式
cd backend
npm run dev

# 前端开发模式（需要先启动后端）
cd frontend
pnpm dev

# 后端生产模式
cd backend && npm build && npm start

# 运行数据库迁移
cd backend && npm run migrate
```

## 端口

- **Backend API**: 3002
- **Frontend Dev**: 3005

## 技术栈

- **后端**: Express 5 + TypeScript + SQLite + better-sqlite3
- **前端**: React 19 + TypeScript + Tailwind CSS v4
- **主题**: Pip-Boy CRT 风格
- **AI**: Ollama (qwen2.5:14b-instruct)

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/rag/profile/submit` | POST | 提交基础问卷 |
| `/api/rag/profile/next-session` | GET | 获取下一个待访谈会话 |
| `/api/rag/profile/generate-followup` | POST | 生成 AI 追问 |
| `/api/rag/profile/answer-followup` | POST | 提交追问回答 |
| `/api/rag/profile/end-phase` | POST | 结束当前阶段 |
| `/api/rag/profile/generate-summary` | POST | 生成会话总结 |
| `/api/rag/profile/approve-summary` | POST | 认可/修改/拒绝总结 |
| `/api/health` | GET | 健康检查 |

## 技术特性

- **三阶段访谈框架**: 叙事探索 + GROW + 价值澄清
- **DICE 追问技术**: 智能对话引导
- **三层数据分离**: 事实层、解释层、洞察层
- **独立数据库**: 10张专用表，数据隔离
- **Ollama LLM**: 支持模型切换（默认 qwen2.5:14b-instruct）

## 数据库表

1. `user_profiles` - 用户基础档案
2. `interview_sessions` - 访谈会话记录
3. `insights` - 核心洞察（三层架构）
4. `user_values` - 价值观
5. `turning_points` - 生命转折点
6. `behavioral_patterns` - 行为模式
7. `goals` - 目标
8. `personality_traits` - 人格特质
9. `insight_relationships` - 洞察关系（知识图谱）
10. `embeddings` - 向量嵌入

## 开发状态

- [x] 后端迁移与 TypeScript 化
- [x] 数据库迁移脚本
- [x] Ollama 服务集成
- [x] 前端项目结构（React + TypeScript）
- [x] 基础 UI 框架（Pip-Boy 主题）
- [x] 启动脚本（后台/调试/停止）
- [ ] Phase 1 问卷页面实现
- [ ] Phase 2 访谈页面实现
- [ ] Phase 3 审批页面实现
- [ ] 集成到主门户

## 维护者

壮爸 - 2025
