# Phase 2.1 个人画像问卷系统

## 📋 简介

独立的、可迁移的个人历史画像深度采集系统模块。

## 🚀 快速启动

```bash
# 方式1: 使用启动脚本
node scripts/profile/start.js

# 方式2: 直接运行服务器
node scripts/profile/server.js
```

访问: http://localhost:3002

## 📁 模块结构

```
profile/                          # 完全独立的模块
├── scripts/profile/              # 后端脚本
│   ├── server.js                # 主服务器
│   ├── migrate.js               # 数据库迁移
│   ├── start.js                 # 启动脚本
│   └── config.json              # 配置文件
├── services/profile/            # 专用服务
│   └── ollama-service.js       # AI 服务
├── viewers/user-profile/        # 前端界面
│   ├── questionnaire.html      # 问卷
│   ├── interview.html          # 访谈
│   └── approval.html           # 认可
└── data/profile/               # 数据存储
    └── profile.db              # 独立数据库

```

## 🔄 迁移说明

本模块设计为**完全独立**，可以轻松迁移到其他项目：

1. 复制以上4个目录到目标项目
2. 安装依赖: `npm install express cors better-sqlite3 axios`
3. 运行: `node scripts/profile/start.js`

## 🛠️ 技术特性

- **三阶段访谈框架**: 叙事探索 + GROW + 价值澄清
- **DICE 追问技术**: 智能对话引导
- **三层数据分离**: 事实层、解释层、洞察层
- **独立数据库**: 10张专用表，数据隔离
- **Ollama LLM**: 支持模型切换

## 👤 作者

壮爸 - 2025-11-24
