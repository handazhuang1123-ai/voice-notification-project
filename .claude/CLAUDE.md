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
module-name/
├── scripts/module-name/     # 独立脚本目录
├── services/module-name/    # 独立服务目录
├── viewers/module-name/     # 独立前端目录
└── data/module-name/        # 独立数据目录
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
- **个人画像系统**: 3002
- **日志查看器**: 55555

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

**阶段 1：RAG 基础设施搭建**（🔄 进行中）

**技术栈**：
- 前端：TypeScript（log-viewer 现有技术栈）
- 后端：Node.js + Express + better-sqlite3（原生 SQL）
- 数据库：`data/rag-database.db`

**目录结构**：
```
voice-notification-project/
├── viewers/log-viewer/          # 现有日志查看器
├── services/                    # RAG 核心服务
│   ├── embedding-service.js
│   └── hybrid-retrieval.js
├── scripts/init-database.js
├── tests/test-retrieval.js
└── data/
    ├── memory.db               # 语音通知系统
    └── rag-database.db         # RAG 系统
```

**详细实施步骤**：`docs/RAG系统实施方案与进度追踪.md`

---

### 长期规划

完整的 5 阶段演进路线图请参考：**`.claude/架构演进指南.md`**

**阶段概览**：
- **阶段 0**：环境清理（✅ 已完成）
- **阶段 1**：RAG 基础设施（🔄 当前）
- **阶段 2**：主入口门户（Vite + React）
- **阶段 3**：共享组件库（packages/ui）
- **阶段 4**：完整后端（Fastify + Drizzle）
- **阶段 5**：统一技术栈（全面 React 化）

---

### Claude 开发指令（架构相关）

1. **严格遵循当前阶段的技术栈**
   - 阶段 1（RAG）：Vanilla JS + better-sqlite3
   - 阶段 2+（新功能）：React + TypeScript
   - 不要提前引入后续阶段的技术

2. **在关键时机主动提示**
   - 发现代码重复 → 提示创建共享组件（阶段 3）
   - 数据管理变复杂 → 提示引入 Drizzle（阶段 4）
   - 需要架构升级 → 阅读 `.claude/架构演进指南.md` 获取详细方案

3. **创建新模块时说明原因**
   - 解释为什么需要这个模块
   - 说明它体现了什么架构优势
   - 提供教学向的内容

4. **保持迁移灵活性**
   - 避免深度框架绑定
   - 数据库 Schema 使用标准 SQL
   - API 遵循 RESTful 规范

---

**维护者**: 壮爸 | **版本**: 2.0 | **更新**: 2025-01-20
