# Phase 2.1 个人画像系统架构文档

## 🏗️ 架构重构对比

### ❌ 重构前（混乱架构）
```
voice-notification-project/
├── data/
│   └── rag-database.db          # ⚠️ 17张表混在一起
│                                 # - 7张 RAG 基础表
│                                 # - 10张 Phase 2.1 表
├── scripts/
│   ├── server-rag-profile.js    # ❌ 直接放在根目录
│   ├── migrate-to-10-tables.js  # ❌ 命名不清晰
│   └── viewers/                 # 其他模块
│
├── services/
│   ├── ollama-service.js        # ⚠️ 专用服务与通用服务混放
│   └── embedding-service.js     # 通用服务
│
└── viewers/
    └── user-profile/             # ✅ 前端正确组织
```

**问题：**
- 🔴 数据库表混放，17张表在同一个数据库
- 🔴 Scripts 文件夹混乱，模块归属不清
- 🔴 服务边界不清，专用与通用混放
- 🔴 违反迁移灵活性原则，无法独立迁移

---

### ✅ 重构后（清晰架构）
```
voice-notification-project/
├── data/
│   ├── rag-database.db          # ✅ 仅保留7张RAG基础表
│   └── profile/                 # ✅ Phase 2.1 独立目录
│       └── profile.db           # ✅ 10张表独立存储
│
├── scripts/
│   └── profile/                 # ✅ Phase 2.1 独立目录
│       ├── server.js            # 主服务器
│       ├── migrate.js           # 数据库迁移
│       ├── start.js             # 启动脚本
│       ├── config.json          # 配置文件
│       └── README.md            # 模块文档
│
├── services/
│   ├── profile/                 # ✅ Phase 2.1 专用服务
│   │   └── ollama-service.js   # AI 服务
│   └── embedding-service.js    # 通用服务（保持不变）
│
└── viewers/
    └── user-profile/            # 前端界面（已正确组织）
```

**优势：**
- ✅ **完全独立** - 4个目录构成完整模块
- ✅ **数据隔离** - 独立数据库，互不干扰
- ✅ **清晰边界** - 模块归属一目了然
- ✅ **易于迁移** - 可整体复制到其他项目

---

## 📊 数据库分离详情

### RAG 基础数据库（data/rag-database.db）
保留7张基础表：
- `knowledge_base` - 知识库主表
- `knowledge_keywords` - 关键词索引
- `user_profile` - 用户基础信息
- `project_evolution` - 项目演进记录
- `user_feedback` - 用户反馈
- `retrieval_stats` - 检索统计
- `sqlite_sequence` - SQLite 系统表

### Phase 2.1 数据库（data/profile/profile.db）
独立10张表：
- `user_profiles` - 用户画像主表
- `interview_sessions` - 访谈会话
- `insights` - 洞察记录
- `user_values` - 价值观
- `turning_points` - 转折点
- `behavioral_patterns` - 行为模式
- `goals` - 目标愿景
- `personality_traits` - 人格特质
- `insight_relationships` - 洞察关系
- `embeddings` - 向量嵌入

---

## 🚀 使用指南

### 启动服务
```bash
# 方式1: 使用启动脚本（推荐）
node scripts/profile/start.js

# 方式2: 直接运行服务器
node scripts/profile/server.js
```

### 访问界面
- 问卷页面: http://localhost:3002/questionnaire.html
- 访谈页面: http://localhost:3002/interview.html
- 认可页面: http://localhost:3002/approval.html

### API 端点
- `GET /api/rag/profile/next-session` - 获取下一个会话
- `POST /api/rag/profile/submit-answer` - 提交问卷答案
- `POST /api/rag/profile/answer-followup` - 回答追问
- `POST /api/rag/profile/generate-followup` - 生成AI追问
- `POST /api/rag/profile/end-phase` - 结束当前阶段
- `POST /api/rag/profile/generate-summary` - 生成分析总结
- `POST /api/rag/profile/approve-summary` - 认可分析结果
- `GET /api/rag/profile/questions` - 获取问题列表

---

## 🔄 迁移到其他项目

本模块设计为**完全独立**，迁移步骤：

1. **复制文件**
   ```bash
   # 复制4个核心目录
   cp -r scripts/profile/ target_project/scripts/
   cp -r services/profile/ target_project/services/
   cp -r viewers/user-profile/ target_project/viewers/
   cp -r data/profile/ target_project/data/
   ```

2. **安装依赖**
   ```bash
   cd target_project
   npm install express cors better-sqlite3 axios
   ```

3. **启动服务**
   ```bash
   node scripts/profile/start.js
   ```

---

## 🛠️ 技术特性

- **三阶段访谈框架**
  - 叙事探索（Narrative）
  - GROW 结构化
  - 价值澄清（Values）

- **DICE 追问技术**
  - Descriptive - 描述性细节
  - Idiographic - 独特记忆
  - Clarifying - 澄清概念
  - Explanatory - 解释原因

- **三层数据分离**
  - 事实层（置信度 0.9-1.0）
  - 解释层（置信度 0.5-0.7）
  - 洞察层（置信度 0.6-0.8）

- **模型支持**
  - 默认：qwen2.5:14b-instruct
  - 备用：qwen2.5:7b-instruct

---

## 📝 配置文件说明

`scripts/profile/config.json`:
```json
{
  "name": "Phase 2.1 个人画像问卷系统",
  "version": "1.0.0",
  "port": 3002,
  "database": {
    "path": "../../data/profile/profile.db",
    "tables": 10
  },
  "models": {
    "default": "qwen2.5:14b-instruct",
    "fallback": "qwen2.5:7b-instruct"
  },
  "migration": {
    "canMoveToStandalone": true,
    "requiredFiles": [
      "scripts/profile/*",
      "services/profile/*",
      "viewers/user-profile/*",
      "data/profile/*"
    ]
  }
}
```

---

## 👤 维护信息

- **作者**: 壮爸
- **创建日期**: 2025-11-24
- **架构重构**: 2025-11-24
- **版本**: 1.0.0

---

## 📚 相关文档

- [Claude.md](../../.claude/CLAUDE.md) - 项目开发规范
- [README.md](./README.md) - 模块快速指南
- [架构演进指南.md](../../.claude/架构演进指南.md) - 整体架构规划