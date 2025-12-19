# Voice Notification Project - Claude 开发指令

## 核心原则

### 1. 充分理解需求后再执行
在执行任务前，通过提问澄清所有重要细节，得到壮爸明确确认后才开始执行。不确定时务必提问。

### 2. 模块独立性
每个功能模块必须：
- 在 `modules/` 下有独立目录
- 包含独立的 backend/、frontend/（如需）、data/、config.json
- 有独立的 package.json，可整体迁移

### 3. 安全优先
禁止硬编码敏感信息，使用环境变量：
```powershell
$ApiKey = $env:OLLAMA_API_KEY
if (-not $ApiKey) { throw "未设置环境变量" }
```

### 4. 最小化修改
- **严格限定范围**：只修改用户明确要求的部分，不要"顺手"优化其他内容
- **增强而非替换**：引入新库/模板时，保留原有功能，在其基础上增强
- **接口即契约**：提示词字段、API 结构、配置格式是与代码的约定，修改前用 `grep` 检查是否被引用
- **禁止假设可选**：不要假设某字段是"示例"或"可删除"，JSON 简化往往意味着功能丢失

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS v4 + Vite 7 |
| 后端 | Node.js + Express 5 + TypeScript + better-sqlite3 |
| 脚本 | PowerShell 7.x |
| 包管理 | pnpm workspace (monorepo) |
| 主题 | @packages/pip-boy-theme（Pip-Boy 风格） |

---

## 目录结构

```
voice-notification-project/
├── modules/                 # 功能模块
│   ├── log-viewer/         # 日志查看器 (端口 3001)
│   ├── profile/            # 个人画像 V1
│   ├── profile-2/          # 个人画像 V2 (端口 3002)
│   └── rag/                # RAG 知识库
├── packages/
│   └── pip-boy-theme/      # 共享 UI 主题
├── portals/
│   └── main/               # 主入口门户 (端口 3000)
├── scripts/                # PowerShell 脚本
└── data/                   # 全局数据
```

---

## 端口分配

| 服务 | 端口 |
|------|------|
| 主入口门户 | 3000 |
| 日志查看器 | 3001 |
| 个人画像系统 | 3002 |

使用 `strictPort: true` 强制端口，避免 Vite 自动切换。

---

## 编码规范

### 格式化
遵循 `.editorconfig` 配置：
- PowerShell: UTF-8 BOM, 4空格, CRLF
- TypeScript/JS: UTF-8, 4空格, LF
- JSON/YAML: UTF-8, 2空格, LF

### PowerShell 函数
使用批准动词（Get-、Set-、New-、Invoke-），PascalCase 变量名，必须有 Comment-Based Help。

### 提交规范
Conventional Commits: `feat(模块): 描述`、`fix(模块): 描述`

---

## Pip-Boy 主题使用

所有前端必须使用 `@packages/pip-boy-theme`。

### index.css
```css
@import "tailwindcss";
@plugin "@packages/pip-boy-theme/crt-plugin";
@config "@packages/pip-boy-theme/tailwind-preset";

body { @apply pip-boy-body; }
```

### 核心类
- 容器: `pip-boy-container`, `pip-boy-screen`, `pip-boy-scanlines`
- 布局: `pip-boy-layout-hcf` (Header-Content-Footer), `pip-boy-layout-master-detail`
- 组件: `pip-boy-panel`, `pip-boy-button`, `pip-boy-input`, `pip-boy-list`
- 效果: `pip-boy-glow`, `pip-boy-glow-multi`, `pip-boy-flicker-subtle`
- 颜色: `text-pip-boy-green` (#4af626), `bg-pip-boy-bg`, `border-pip-boy-border`

禁止自定义 CRT 效果或颜色变量。

---

## 参考文档

- 各模块 `README.md` - 模块具体说明

---

**维护者**: 壮爸
