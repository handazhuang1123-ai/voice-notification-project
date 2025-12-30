# Note-Review 模块

> AI 启发式笔记复习系统 - 从 Obsidian 笔记生成复习问题

## 功能愿景

### 解决的问题

1. **时间有限**：看完一本书就很难，二次阅读做文献笔记需要时间
2. **复习断层**：整理了 #input 笔记，但没时间回看和形成 #output 永久笔记
3. **缺乏启发**：需要外部刺激来激发思考，形成自己的观点

### 核心理念

- **AI 只做启发，不做替代**：AI 生成问题启发思考，最终观点由用户自己形成
- **数据安全第一**：只读访问 Obsidian 笔记，绝不修改原文件
- **网络式复习**：不仅复习近期内容，还通过链接带出关联的历史知识

---

## 工作流设计

```
【Phase 1: 阅读 → 文献笔记】（现有流程，不变）
┌──────────┐    ┌──────────┐    ┌──────────────────┐
│  实体书   │ →  │ 二次阅读  │ →  │ Obsidian #input  │
│  睡前读   │    │ 按章节记  │    │ 摘录+链接+发散    │
└──────────┘    └──────────┘    └──────────────────┘

【Phase 2: AI 启发推送】（本模块）
┌──────────────────┐    ┌──────────────┐    ┌──────────┐
│ 定时任务（每天）   │ →  │ 读取近期笔记  │ →  │ AI 生成   │
│ 只读 Obsidian    │    │ + 链接笔记    │    │ 2个问题   │
└──────────────────┘    └──────────────┘    └──────────┘
                                                  ↓
                                           ┌──────────┐
                                           │ 邮件推送  │
                                           └──────────┘

【Phase 3: 语音回答 → 暂存】
┌──────────┐    ┌──────────────┐    ┌─────────────────┐
│ 收到邮件  │ →  │ 语音输入回答  │ →  │ 独立数据库暂存   │
│ 手机查看  │    │ （微信/备忘录）│    │ 原始版+整理版    │
└──────────┘    └──────────────┘    └─────────────────┘

【Phase 4: 手动整理】
┌─────────────────┐    ┌──────────────────┐
│ 查看暂存的回答   │ →  │ 手动整理到       │
│ 30min-1h/周     │    │ Obsidian #output │
└─────────────────┘    └──────────────────┘
```

---

## 问题生成逻辑

```
Step 1: 按时间筛选近期笔记（默认7天）
        ↓
Step 2: 提取所有 [[链接]]（排除图片）
        ↓
Step 3: 读取链接目标笔记内容
        ↓
Step 4: AI 生成 2 个混合类型问题
        - 概念理解：解释某个概念
        - 关联启发：两个概念之间的联系
        - 应用场景：概念在实际中的应用
```

---

## 目录结构

```
modules/note-review/
├── backend/
│   └── src/
│       ├── index.ts              # 主入口，启动定时任务
│       ├── cli.ts                # 命令行工具
│       ├── note-reader.ts        # 笔记读取器（只读）
│       ├── question-generator.ts # AI 问题生成器
│       ├── email-sender.ts       # 邮件发送服务
│       ├── database.ts           # SQLite 数据库操作
│       └── types.ts              # 类型定义
├── data/
│   └── reviews.db                # SQLite 数据库
├── scripts/
│   ├── start.cmd                 # Windows 启动脚本
│   └── start-debug.cmd           # 调试启动脚本
├── config.json                   # 配置文件
├── package.json
├── tsconfig.json
└── README.md
```

---

## 技术栈

| 组件 | 技术 | 理由 |
|------|------|------|
| 运行时 | Node.js + TypeScript | 与项目现有技术栈一致 |
| AI | Anthropic Claude API | 质量好，已有 API |
| 数据库 | better-sqlite3 | 轻量、独立、无需服务 |
| 邮件发送 | Gmail SMTP (nodemailer) | 稳定、免费、不被拦截 |
| 邮件读取 | IMAP (待实现) | 读取用户回复 |
| 定时任务 | node-cron | 轻量、可靠 |

---

## 数据库设计

```sql
-- 生成的问题
CREATE TABLE questions (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_notes TEXT,      -- JSON: 来源笔记列表
    linked_notes TEXT,      -- JSON: 关联笔记列表
    question_type TEXT,     -- concept/relation/application
    question_text TEXT,     -- 问题内容
    context TEXT,           -- 问题的上下文摘录
    sent_at DATETIME,       -- 发送时间
    answered_at DATETIME    -- 回答时间
);

-- 用户回答
CREATE TABLE answers (
    id INTEGER PRIMARY KEY,
    question_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_text TEXT,          -- 原始语音转文字
    refined_text TEXT,      -- AI 整理版
    transferred BOOLEAN DEFAULT 0,  -- 是否已整理到 Obsidian
    FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

---

## 使用方式

```bash
# 安装依赖
pnpm install

# 手动生成今日问题（不发送）
pnpm generate

# 发送今日问题
pnpm send

# 查看历史问题
pnpm list

# 启动定时服务（每天自动生成+发送）
pnpm start
```

---

## 配置说明

编辑 `config.json`：

```json
{
  "obsidian": {
    "notesPath": "../../data/obsidion notes",
    "readOnly": true,
    "recentDays": 7
  },
  "review": {
    "questionsPerDay": 2,
    "scheduleTime": "08:00"
  },
  "email": {
    "enabled": true,
    "to": "your-email@example.com"
  }
}
```

环境变量（`.env` 文件）：
```bash
# AI 服务
ANTHROPIC_BASE_URL=http://xxx/api  # 代理服务地址
ANTHROPIC_API_KEY=xxx              # API 密钥

# Gmail SMTP
GMAIL_USER=your-email@gmail.com    # Gmail 地址
GMAIL_APP_PASSWORD=xxx             # 应用专用密码（16位）
```

获取 Gmail 应用专用密码：
1. 开启两步验证：https://myaccount.google.com/signinoptions/two-step-verification
2. 创建应用密码：https://myaccount.google.com/apppasswords

---

## 数据安全保证

| 操作 | 权限 | 说明 |
|------|------|------|
| 读取 Obsidian 笔记 | ✅ 只读 | 绝不写入、修改、删除 |
| 生成问题 | ✅ AI 处理 | 不改变原文 |
| 存储回答 | ✅ 独立 DB | 与 Obsidian 完全隔离 |
| 整理到 Obsidian | ✅ 手动 | 用户自己操作 |

---

## 路线图

### MVP（已完成 ✅）
- [x] 笔记读取器（只读 Obsidian）
- [x] AI 问题生成器
- [x] 邮件推送（Gmail SMTP）
- [x] 定时任务
- [x] CLI 工具

### Phase 2：回复记录（进行中）
- [ ] **Gmail 回复读取**：通过 IMAP 读取用户邮件回复
- [ ] **回复解析**：提取用户新写的内容（过滤原邮件引用）
- [ ] **数据库存储**：按序号关联问题和回复
- [ ] CLI 命令：`pnpm check-replies`

### Phase 3：AI 追问（规划中）
- [ ] **智能追问**：根据用户回复，AI 生成追问深化思考
- [ ] **追问邮件**：发送追问到用户邮箱
- [ ] **多轮对话**：支持多轮问答，形成完整思考链

### Phase 4：移动端体验（规划中）
- [ ] **语音播报**：开车时语音播报问题
- [ ] **语音回答**：用户语音回答，程序录音
- [ ] **语音转文字**：自动转录并存储
- [ ] **AI 总结**：将语音回答整理成结构化文本
- [ ] 可能的实现方式：
  - 微信小程序
  - 独立 App
  - 电话/语音助手集成

### Phase 5：可视化界面（规划中）
- [ ] **配置界面**：Web 页面调整参数
  - 每天问题数量
  - 定时发送时间
  - 笔记读取天数范围
- [ ] **历史查看**：查看所有问答记录
- [ ] **统计分析**：复习频率、回答质量趋势

---

## 铁令 🚫

**AI 绝对不能修改 Obsidian 原始笔记库**

所有数据操作仅限于：
- 读取 Obsidian 笔记（只读）
- 写入独立的 SQLite 数据库
- 发送/读取邮件

用户手动整理回答到 Obsidian，系统不参与。
