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
├── frontend/          # React 前端（计划中）
│   └── src/
│
├── data/              # 数据文件
│   └── profile.db
│
├── config.json        # 模块配置
└── README.md
```

## 运行

```bash
# 后端开发模式
cd backend
pnpm dev

# 后端生产模式
pnpm build
pnpm start

# 运行数据库迁移
pnpm migrate
```

## 端口

- HTTP Server: 3002

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

## 状态

- [x] 后端迁移
- [ ] 前端 React 化
- [ ] 集成到主门户
