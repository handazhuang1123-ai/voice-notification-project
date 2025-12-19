# Profile-2 架构与运行机制

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Profile-2 系统架构                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                 前端 (React)                                 │
│                                  Port: 3002                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  QuestionList ───▶ Interview ───▶ API Client                                │
│  (问题列表)        (访谈对话)      (HTTP请求)                                │
│                                                                              │
│  • 流式打字效果    • Pip-Boy 终端风格 UI    • 会话状态管理                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ HTTP REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端 (Express + TS)                             │
│                                  Port: 3102                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Routes: session.ts / user.ts / system.ts                                    │
│                                      │                                       │
│  Services:                                                                   │
│  QuestionGenerator ──▶ PhaseEvaluator ──▶ ContextManager                    │
│       (追问生成)          (阶段判断)         (上下文管理)                     │
│                               │                                              │
│  ContextCompressor    OllamaService    GROWHandler    SummaryGenerator      │
│    (上下文压缩)        (AI 调用)       (GROW处理)      (独立总结)            │
│                                                                              │
│  Prompts: system-prompts.ts / phase-evaluation.ts / summary-prompts.ts      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                    ┌──────────────────┴──────────────────┐
                    ▼                                      ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│     SQLite (better-sqlite3)         │  │         Ollama API                  │
│       data/profile-v2.db            │  │      localhost:11434                │
├─────────────────────────────────────┤  ├─────────────────────────────────────┤
│  8 张数据表:                         │  │  支持模型:                          │
│  users / sessions / turns           │  │  • qwen2.5:14b (默认)               │
│  values / insights / goals          │  │  • qwen2.5:7b                       │
│  rag_sync_queue / phase_transitions │  │  • llama3.1:8b                      │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 目录结构与文件说明

```
profile-2/
├── backend/src/
│   ├── server.ts                 # 入口文件
│   ├── config.ts                 # 配置管理，问题策略定义
│   ├── types.ts                  # TypeScript 类型定义
│   ├── migrate.ts                # 数据库迁移脚本（创建8表）
│   ├── routes/
│   │   ├── session.ts            # 会话管理 API（核心）
│   │   ├── user.ts               # 用户数据 API
│   │   └── system.ts             # 系统管理 API
│   ├── services/
│   │   ├── database.ts           # 数据库操作封装
│   │   ├── ollama-service.ts     # Ollama API 调用
│   │   ├── context-manager.ts    # 上下文构建与管理
│   │   ├── context-compressor.ts # 长对话上下文压缩
│   │   ├── question-generator.ts # 追问生成器（核心）
│   │   ├── phase-evaluator.ts    # 阶段判断器（核心）
│   │   ├── grow-handler.ts       # GROW 阶段处理器
│   │   ├── summary-generator.ts  # 独立总结生成器（核心）
│   │   └── logger.ts             # 日志服务
│   ├── prompts/
│   │   ├── system-prompts.ts     # 各阶段系统提示词
│   │   ├── phase-evaluation.ts   # 阶段评估提示词
│   │   └── summary-prompts.ts    # 独立总结提示词
│   ├── schemas/                  # Zod Schema (Structured Outputs)
│   │   ├── dialogue.ts / evaluation.ts / grow.ts
│   └── middleware/error-handler.ts
│
├── frontend/src/
│   ├── main.tsx / App.tsx        # 入口与路由
│   ├── index.css                 # Pip-Boy 主题样式
│   ├── types.ts / constants.ts   # 类型与常量
│   ├── api/client.ts             # API 客户端封装
│   └── pages/
│       ├── QuestionList.tsx      # 问题列表页面
│       └── Interview.tsx         # 访谈对话页面（核心）
│
├── data/profile-v2.db            # SQLite 数据库
├── config.json                   # 模块配置
└── start.cmd / stop.cmd          # 启动脚本
```

---

## 运行机制详解

### 1. 前端运行机制

```
用户操作 → React 组件 → API Client → HTTP 请求 → 后端
    ↑                                              │
    └──────────── 响应渲染 ◄────────────────────────┘
```

**核心流程 (Interview.tsx)**:
1. **初始化**: 用户选择问题 → 输入初始回答 → 调用 api.startSession()
2. **会话恢复**: 检测到已有会话 → 弹窗询问继续/新建 → 调用 api.getSession()
3. **对话循环**: 用户输入 → api.sendMessage() → typeAiMessage() 流式显示
4. **总结确认**: 进入 summary 阶段 → 显示总结内容 → 用户确认入库或拒绝结束

**状态管理**:
- sessionState: 会话 ID、当前阶段、进度百分比
- systemLogs: 系统日志队列（流式打字显示）
- displayedAiText: 当前 AI 回复（流式显示）

### 2. 后端运行机制

**核心流程 (POST /api/session/message)**:

```
1. 验证 session 存在且状态为 in_progress
           │
           ▼
2. contextManager.buildContext() 获取会话、轮次、价值观
           │
           ▼
3. contextCompressor.compress() 压缩长对话历史
           │
           ▼
4. AI 生成:
   ├─ GROW 阶段 → growHandler.generate()
   └─ 其他阶段 → ollamaService.generateStructured()
           │
           ▼
5. 数据持久化: db.addTurn() / db.addValue()
           │
           ▼
6. phaseEvaluator.evaluate() 判断是否转换阶段
           │
           ▼
7. 返回响应: AI 回复 + 当前阶段 + 进度信息
```

**阶段评估逻辑 (PhaseEvaluator)**:

```
快速规则检查 (无需 AI)
    ├─ 达到最大轮数 → 强制进入 Summary
    ├─ Opening 完成 1 轮 → 转换到下一阶段
    └─ Values Narrative 识别 ≥4 价值观 → 转换
         │
         ▼ (规则未命中)
AI 评估 (Structured Outputs)
         │
         ▼ (建议转换到 Summary)
完成度二次确认 (分数 ≥80 才允许转换)
```

### 3. 数据库设计

**8 表结构与关系**:

```
users (用户表)
  │
  └──< sessions (会话表) ──< turns (对话轮次表)
              │
              ├──< values (价值观表)
              ├──< insights (洞察表)
              ├──< goals (目标表)
              └──< phase_transitions (阶段转换记录)

rag_sync_queue (RAG 同步队列) - 独立表
```

**核心表字段**:

| 表名 | 核心字段 | 说明 |
|------|----------|------|
| sessions | current_phase, status, version, is_active | 阶段状态机 + 版本管理 |
| turns | phase, probe_type, ai_reasoning | 记录每轮对话及 AI 决策 |
| values | domain, depth_layer, user_confirmed | 价值观分层 + 用户确认 |
| goals | GROW 四阶段字段 | 完整记录 GROW 过程 |
| phase_transitions | from_phase, to_phase, reasons | 阶段转换审计日志 |

**数据保护机制**:
- version: 每次重新开始递增版本号
- is_active: 归档旧会话而非删除
- status: pending_approval 状态需用户确认入库

### 4. 前后端联动示例

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/session/message                    │
└─────────────────────────────────────────────────────────────────┘

前端 Interview.tsx                    后端 session.ts
        │                                    │
        │  { session_id, message }           │
        │ ──────────────────────────────────▶│
        │                                    │
        │                          ┌─────────┴─────────┐
        │                          │ 1. 验证 session   │
        │                          │ 2. 构建上下文      │
        │                          │ 3. 调用 Ollama    │
        │                          │ 4. 保存轮次       │
        │                          │ 5. 评估阶段       │
        │                          └─────────┬─────────┘
        │                                    │
        │  {                                 │
        │    response: "AI回复",             │
        │    phase: "values_narrative",      │
        │    turn_number: 3,                 │
        │    phase_transition: {...},        │
        │    progress: {                     │
        │      progress_percent: 40          │
        │    }                               │
        │  }                                 │
        │ ◀──────────────────────────────────│
        │                                    │
┌───────┴───────┐
│ 更新状态:      │
│ • sessionState │
│ • systemLogs   │
│ • 流式显示 AI  │
└───────────────┘
```

---

## 问题策略配置 (config.ts)

每个问题可独立配置阶段组合:

| 问题 ID | Opening | Values | Deep | GROW | 轮数限制 |
|---------|---------|--------|------|------|----------|
| life_chapters | ✓ | ✓ | ✓ | ✗ | 9-20 |
| education_career | ✗ | ✓ | ✓ | ✓ | 12-28 |
| relationships | ✗ | ✓ | ✓ | ✗ | 9-18 |
| future_aspirations | ✗ | ✓ | ✗ | ✓ | 10-24 |
| values_beliefs | ✗ | ✗ | ✗ | ✗ | 5-10 (特殊: values_validation) |
| life_philosophy | ✗ | ✓ | ✗ | ✗ | 8-16 (增强总结) |

---

## Summary 独立流程

### 设计原则

Summary 阶段与对话阶段分离，拥有独立的生成逻辑和确认流程：

```
┌─────────────────────────────────────────────────────────────────┐
│                      Summary 独立流程                            │
└─────────────────────────────────────────────────────────────────┘

阶段转换触发                    后端 SummaryGenerator
        │                              │
        │  phaseEvaluator.transition   │
        │  to: 'summary'               │
        │ ────────────────────────────▶│
        │                              │
        │                    ┌─────────┴─────────┐
        │                    │ 1. 收集全部上下文  │
        │                    │ 2. 调用专用提示词  │
        │                    │ 3. 生成总结内容    │
        │                    │ 4. 状态→pending   │
        │                    └─────────┬─────────┘
        │                              │
        │  { summary, requiresApproval }│
前端 Interview.tsx ◀───────────────────┘
        │
        │  显示总结内容
        │  [确认入库] [拒绝结束]
        │
        ├──── 确认 ────▶ PUT /api/session/:id/summary/approve
        │                     │
        │                     ▼
        │               status → approved
        │               数据持久化
        │
        └──── 拒绝 ────▶ PUT /api/session/:id/summary/reject
                              │
                              ▼
                        status → rejected
                        结束会话（不入库）
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/session/:id/summary | 生成总结（不入库，返回预览） |
| PUT | /api/session/:id/summary/approve | 确认入库 |
| PUT | /api/session/:id/summary/reject | 拒绝结束 |

### 文件职责

| 文件 | 职责 |
|------|------|
| summary-generator.ts | 独立总结生成器，收集上下文并调用 AI |
| summary-prompts.ts | 专用总结提示词，与对话提示词分离 |
| session.ts | 新增总结相关 API 端点 |
| Interview.tsx | 总结确认 UI（显示内容 + 确认/拒绝按钮） |

---

**维护者**: 壮爸 | **版本**: 2.1.0
