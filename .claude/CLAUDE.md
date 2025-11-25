# Voice Notification Project - Claude 开发指令

## 🚨 最高优先级原则

### **保持扩展性和迁移灵活性（架构第一原则）**

**每个新模块必须：**
- 📁 **独立的文件夹结构** - 功能模块应有自己的目录（如 `scripts/profile/`、`services/profile/`）
- 💾 **独立的数据存储** - 使用独立的数据库或表空间（如 `data/profile/profile.db`）
- 🔗 **清晰的依赖边界** - 避免深度耦合，依赖关系必须明确且最小化
- 📦 **可整体迁移** - 模块应能作为整体移植到其他项目
- 📝 **独立的配置文件** - 每个模块有自己的 `config.json`

**反面示例（❌ 错误）：**
- 将新功能的表混入现有数据库
- 将脚本直接放在 scripts 根目录
- 服务文件与其他模块混放
- 硬编码跨模块的路径引用

**正面示例（✅ 正确）：**
```
modules/module-name/
├── backend/                  # TypeScript 后端
│   ├── src/
│   └── package.json
├── frontend/                 # React 前端（如需要）
│   ├── src/
│   └── package.json
├── data/                     # 独立数据目录
│   └── database.db
├── config.json               # 模块配置
└── README.md
```

## Claude 特殊指令（核心要求）

1. **⚠️ 必须充分理解需求后再执行**
   - 在执行任何任务前，必须通过反复提问来澄清所有重要的细节
   - 直到完全了解需求并得到壮爸的明确确认后，才可以开始执行任务
   - 不要假设或猜测需求，不确定时务必提问

2. **始终用中文回复**

3. **遵循下述所有编码规范**

4. **每个函数必须有完整 Comment-Based Help**

5. **永远不硬编码敏感信息**

---

## 项目简介

多功能集成实验场，采用渐进式搭建策略，逐步实现博客、语言学习工具、RAG 知识库等多方向综合功能。

**当前技术栈**: PowerShell 7.x + Node.js + TypeScript + Ollama API

---

## 核心编码原则

### PowerShell 规范
- **函数命名**: 使用批准动词（Get-、Set-、New-、Invoke- 等）
- **变量命名**: PascalCase（`$NotificationText`, `$OllamaResponse`）
- **格式化**: 4空格缩进，OTBS风格，UTF-8 BOM，CRLF换行
- **文档**: 所有导出函数必须有完整的 Comment-Based Help

### 编码格式规则（.editorconfig）

**PowerShell 文件 (*.ps1, *.psm1, *.psd1)**：
- **字符编码**: UTF-8 BOM (`charset = utf-8-bom`)
- **缩进方式**: 空格 (`indent_style = space`)
- **缩进大小**: 4 空格 (`indent_size = 4`)
- **换行符**: CRLF (`end_of_line = crlf`)
- **文件末尾**: 插入空行 (`insert_final_newline = true`)
- **尾随空格**: 删除 (`trim_trailing_whitespace = true`)

**其他文件格式**：
- **Markdown (*.md)**: UTF-8, 2空格, LF, 保留尾随空格
- **JSON (*.json)**: UTF-8, 2空格, LF
- **YAML (*.yml, *.yaml)**: UTF-8, 2空格, LF
- **XML (*.xml, *.csproj)**: UTF-8, 2空格
- **Batch (*.cmd, *.bat)**: UTF-8, CRLF
- **Shell (*.sh)**: UTF-8, 2空格, LF

> **严格参考**: `.editorconfig` 定义了所有文件类型的编码格式规则，`.gitattributes` 规范了换行符处理

### Comment-Based Help 模板（双语版本）
```powershell
function Verb-Noun {
    <#
    .SYNOPSIS
        Brief description (one line)
        简短描述（一行）

    .PARAMETER ParameterName
        Parameter description
        参数说明

    .EXAMPLE
        Verb-Noun -ParameterName "value"
        Example description
        示例说明

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ParameterName
    )

    # Implementation logic | 实现逻辑
}
```


## 安全要求

**禁止硬编码敏感信息**：
```powershell
# ✗ 错误
$ApiKey = "sk-1234567890"

# ✓ 正确
$ApiKey = $env:OLLAMA_API_KEY
if (-not $ApiKey) {
    throw "未设置 OLLAMA_API_KEY 环境变量"
}
```

> **严格参考**: `.gitignore` 已配置敏感文件忽略规则（`config.local.ps1`, `credentials.json`, `.env` 等）

---

## 端口管理规范

### 标准端口分配
- **主入口门户**: 3000
- **日志查看器**: 3001
- **个人画像系统**: 3002

### 开发注意事项

1. **不要随意更改端口**
   - Vite 看到端口被占用会自动尝试下一个端口，但这会导致混乱
   - 使用 `strictPort: true` 强制使用指定端口

2. **先检查占用**
   - 如果端口被占用，先用 `netstat` 查看是什么程序占用
   - Windows: `netstat -aon | findstr :端口号`
   - 查看进程名: `wmic process where processid=PID get name`

3. **正确清理**
   - 开发完成后要正确关闭服务器，避免进程残留
   - 清理残留进程: `wmic process where processid=PID delete`

---

## 提交规范

使用 Conventional Commits 格式（通过 GitHub MCP 提交时使用）：
- `feat`: 新功能
- `fix`: 修复Bug
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试

示例：`feat(ollama): 添加重试机制`

---

## 其他参考文档

- **`docs/PowerShell项目标准化最佳实践调研报告.md`** - PowerShell 详细最佳实践和深入说明

---

---

## 项目架构演进

### 核心定位

本项目是**多功能集成实验场**，采用**渐进式搭建**策略（毛坯房逐步装修）。

**目标**：
1. 实现个人想法的多方向综合（博客、语言学习工具、RAG 知识库等）
2. 锻炼大型项目功能集成能力
3. 保持扩展性和迁移灵活性

---

### 技术栈选型（2025-01-20 确定）

#### 前端
- **构建工具**: Vite
- **框架**: React 18 + TypeScript
- **路由**: React Router v6
- **状态管理**: Zustand
- **UI 组件**: shadcn/ui（可复制粘贴、完全可控）
- **样式**: Tailwind CSS

#### 后端
- **运行时**: Node.js + TypeScript
- **Web 框架**: Fastify
- **数据库**: SQLite
- **ORM**: Drizzle ORM
- **嵌入模型**: Ollama + Qwen3-embedding:0.6b

#### 项目管理
- **Monorepo**: pnpm workspace

> **为什么选 Vite 而非 Next.js？**
> 多个功能关联不大，Vite 更轻量、易迁移、适合学习底层架构。

---

### 当前阶段

**架构重构已完成**（✅ 2025-01-25）

**技术栈**：
- 前端：React 19 + TypeScript + Tailwind CSS v4
- 后端：Node.js + Express 5 + better-sqlite3
- 构建工具：Vite 7
- 包管理：pnpm workspace (monorepo)
- 主题：Pip-Boy 风格（CRT效果、磷光绿 #4af626）

**目录结构**：
```
voice-notification-project/
├── modules/                     # 功能模块（核心）
│   ├── log-viewer/             # 日志查看器
│   │   ├── backend/            # Express 后端
│   │   ├── data/               # 日志数据
│   │   └── config.json
│   ├── profile/                # 个人画像系统
│   │   ├── backend/            # Express 后端
│   │   ├── data/               # SQLite 数据库
│   │   └── config.json
│   └── rag/                    # RAG 知识库
│       ├── backend/            # 混合检索引擎
│       ├── data/               # 向量数据库
│       └── config.json
│
├── packages/                    # 共享包
│   └── pip-boy-theme/          # Pip-Boy UI 主题
│       ├── tailwind-preset.js  # Tailwind 预设
│       ├── crt-plugin.js       # CRT 效果插件
│       └── components/         # React 组件
│
├── portals/                     # 入口门户
│   └── main/                   # 主入口（端口3000）
│
├── viewers/                     # 独立前端（待迁移）
│   └── log-viewer/             # 原日志查看器前端
│
├── scripts/                     # PowerShell 脚本
│   └── voice-notification/     # 语音通知系统
│
└── data/                        # 全局数据
    └── memory.db               # 语音通知数据库
```

**模块说明**：
- `modules/log-viewer` - 日志实时监控，长轮询推送
- `modules/profile` - DICE+GROW 个人画像问卷系统
- `modules/rag` - 向量检索 + BM25 + RRF 融合

---

### 长期规划

**已完成阶段**：
- ✅ pip-boy-theme Tailwind 化
- ✅ log-viewer 模块迁移至 modules/
- ✅ profile 模块迁移至 modules/
- ✅ RAG 模块迁移至 modules/
- ✅ 门户集成 @packages/pip-boy-theme

**后续优化方向**：
- 前端统一迁移至 React + TypeScript
- 引入 Drizzle ORM 替代原生 SQL
- 添加单元测试和 E2E 测试

---

### Claude 开发指令（架构相关）

1. **新模块统一使用 TypeScript**
   - 后端：Express 5 + TypeScript
   - 前端：React 19 + TypeScript + Tailwind CSS
   - 使用 pnpm workspace 管理依赖

2. **模块创建规范**
   - 在 `modules/` 目录下创建新模块
   - 包含 backend/、frontend/（如需）、data/、config.json
   - 每个模块有独立的 package.json

3. **使用共享主题**
   - 引用 `@packages/pip-boy-theme` 获取 Pip-Boy 风格
   - 保持 CRT 效果和磷光绿（#4af626）视觉一致性

4. **保持迁移灵活性**
   - 避免深度框架绑定
   - 数据库 Schema 使用标准 SQL
   - API 遵循 RESTful 规范

---

**维护者**: 壮爸 | **版本**: 3.0 | **更新**: 2025-01-25
