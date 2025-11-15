# Claude扩展架构实施方案（方案C：混合架构）

> **项目**: Voice Notification Project
> **作者**: 壮爸
> **日期**: 2025-01-15
> **版本**: 1.0

---

## 目录

- [一、架构总览](#一架构总览)
- [二、设计原则](#二设计原则)
- [三、完整目录结构](#三完整目录结构)
- [四、核心组件说明](#四核心组件说明)
- [五、实施步骤](#五实施步骤)
- [六、配置说明](#六配置说明)
- [七、使用指南](#七使用指南)
- [八、FAQ](#八faq)

---

## 一、架构总览

### 1.1 核心理念

本架构采用**三层分离**设计：

```
┌─────────────────────────────────────────────┐
│  Hook触发层 (.claude/hooks/)                 │
│  职责：接收Claude Code事件，调度扩展         │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  扩展适配层 (.claude/extensions/)            │
│  职责：适配Claude环境，调用核心模块          │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  核心业务层 (modules/, scripts/)             │
│  职责：提供可复用的核心功能，独立于Claude    │
└─────────────────────────────────────────────┘
```

### 1.2 设计优势

| 优势 | 说明 |
|------|------|
| **功能独立** | 语音总结和RAG记忆完全解耦，可独立启用/禁用 |
| **最小改动** | 保留现有代码结构，VectorMemory.psm1和memory.db位置不变 |
| **易于理解** | 扩展是"薄封装"，核心逻辑在modules/，职责清晰 |
| **跨项目复用** | 复制`.claude/extensions/`即可迁移到其他项目 |
| **灵活扩展** | 添加新功能只需在extensions/下新建文件夹 |

---

## 二、设计原则

### 2.1 关注点分离（Separation of Concerns）

```
modules/VectorMemory.psm1        ← "是什么"（核心引擎，可独立使用）
      ↑ 被调用
.claude/extensions/rag-memory/   ← "何时用"（Claude触发时的适配器）
      ↑ 被调度
.claude/hooks/dispatcher.ps1     ← "如何调度"（统一入口）
```

### 2.2 单一入口原则

```json
// .claude/settings.json - 永远只有一个Hook入口
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {"command": "powershell ... dispatcher.ps1"}
        ]
      }
    ]
  }
}
```

### 2.3 配置驱动原则

```
启用/禁用扩展：修改 .claude/extensions/{扩展名}/config.json
              或 直接删除扩展文件夹

不需要修改：.claude/settings.json
不需要修改：.claude/hooks/dispatcher.ps1
```

---

## 三、完整目录结构

```
voice-notification-project/
│
├── 【核心业务层】
│   ├── modules/                          # 核心业务模块
│   │   └── VectorMemory.psm1            # RAG向量记忆引擎（保留不动）
│   │
│   ├── scripts/                          # 业务脚本
│   │   ├── Initialize-MemoryDatabase.ps1
│   │   ├── Fix-VectorMemoryDatabase.ps1
│   │   └── Query-Memory.ps1             # 查询工具（可选）
│   │
│   ├── data/                             # 业务数据
│   │   └── memory.db                    # RAG数据库（保留不动）
│   │
│   └── docs/                             # 项目文档
│       ├── 本文档.md
│       └── 其他研究报告.md
│
├── 【Claude扩展层】
│   └── .claude/
│       ├── settings.json                # Hook配置（仅一个入口）
│       │
│       ├── hooks/                       # Hook入口目录
│       │   └── dispatcher.ps1          # 主调度器（唯一入口）
│       │
│       ├── extensions/                  # 扩展功能目录
│       │   │
│       │   ├── voice-summary/           # 扩展1：语音总结提醒
│       │   │   ├── voice-summary.ps1   # 主脚本
│       │   │   ├── helpers/            # 辅助脚本
│       │   │   │   ├── Extract-Messages.ps1
│       │   │   │   └── Generate-Summary.ps1
│       │   │   ├── config.json         # 配置文件
│       │   │   ├── logs/               # 日志目录
│       │   │   │   └── voice-summary.log
│       │   │   └── README.md           # 功能说明
│       │   │
│       │   └── rag-memory/              # 扩展2：RAG记忆系统
│       │       ├── rag-memory.ps1      # 主脚本（薄封装）
│       │       ├── config.json         # 配置文件
│       │       ├── logs/               # 日志目录
│       │       │   └── rag-memory.log
│       │       └── README.md           # 功能说明
│       │
│       ├── modules/                     # Claude工具模块
│       │   ├── ErrorMonitor.psm1
│       │   ├── Invoke-PlayAudio.psm1
│       │   ├── Logger.psm1
│       │   └── StringAlignment.psm1
│       │
│       └── data/                        # Claude数据
│           └── error-stats.json
│
└── 【标准配置文件】
    ├── .gitignore
    ├── .editorconfig
    ├── .gitattributes
    └── PSScriptAnalyzerSettings.psd1
```

---

## 四、核心组件说明

### 4.1 Hook调度器（dispatcher.ps1）

**路径**: `.claude/hooks/dispatcher.ps1`

**职责**：
- 唯一的Hook入口点
- 自动发现和执行所有启用的扩展
- 提供统一的错误处理和日志
- 支持扩展的并行/串行执行

**核心逻辑**：
```powershell
# 1. 读取extensions/目录
# 2. 对于每个扩展：
#    - 检查是否存在
#    - 读取config.json
#    - 如果enabled=true，执行主脚本
# 3. 独立进程运行，互不影响
```

### 4.2 扩展1：语音总结提醒

**路径**: `.claude/extensions/voice-summary/`

**功能**：
1. 提取对话内容（用户消息+Claude回复）
2. 调用Ollama AI生成简短总结
3. 通过Windows TTS语音播报

**主要文件**：
- `voice-summary.ps1` - 主脚本（被dispatcher调用）
- `helpers/Extract-Messages.ps1` - 从transcript.jsonl提取消息
- `helpers/Generate-Summary.ps1` - 调用Ollama生成总结
- `config.json` - 配置（AI模型、字数限制、语音设置）

**数据流**：
```
transcript.jsonl → Extract-Messages → Generate-Summary → TTS播报
```

### 4.3 扩展2：RAG记忆系统

**路径**: `.claude/extensions/rag-memory/`

**功能**：
1. 提取对话内容
2. 调用核心VectorMemory模块保存到数据库
3. 异步处理：向量化、实体提取、偏好学习

**主要文件**：
- `rag-memory.ps1` - 主脚本（薄封装，调用VectorMemory.psm1）
- `config.json` - 配置（嵌入模型、异步处理开关）

**数据流**：
```
transcript.jsonl → rag-memory.ps1 → VectorMemory.psm1 → data/memory.db
                                   ↓
                                 后台Job：向量化+实体提取
```

**核心设计**：
- 扩展本身只是**适配器**，负责对接Claude环境
- 真正的业务逻辑在`modules/VectorMemory.psm1`
- 这样VectorMemory可以独立使用（不依赖Claude）

### 4.4 核心业务模块（VectorMemory.psm1）

**路径**: `modules/VectorMemory.psm1`

**职责**：
- 提供RAG记忆的核心功能
- 管理SQLite数据库和向量存储
- 可被多个地方调用：
  - `.claude/extensions/rag-memory/` （Claude Hook）
  - `scripts/` （独立脚本）
  - 其他项目（导入模块）

**核心函数**：
```powershell
Save-ConversationToRAG         # 保存对话
Get-TextEmbedding              # 生成向量嵌入
Search-MemoryByVector          # 向量检索
Extract-EntitiesFromText       # 实体提取
Update-KnowledgeGraph          # 更新知识图谱
```

---

## 五、实施步骤

### 阶段1：创建扩展目录结构（5分钟）

```powershell
# 1. 创建extensions目录
New-Item -ItemType Directory -Path ".claude/extensions" -Force

# 2. 创建voice-summary扩展
New-Item -ItemType Directory -Path ".claude/extensions/voice-summary" -Force
New-Item -ItemType Directory -Path ".claude/extensions/voice-summary/helpers" -Force
New-Item -ItemType Directory -Path ".claude/extensions/voice-summary/logs" -Force

# 3. 创建rag-memory扩展
New-Item -ItemType Directory -Path ".claude/extensions/rag-memory" -Force
New-Item -ItemType Directory -Path ".claude/extensions/rag-memory/logs" -Force
```

### 阶段2：迁移现有文件（10分钟）

```powershell
# 1. 移动语音相关脚本到voice-summary/helpers/
Move-Item ".claude/hooks/Extract-Messages.ps1" `
          ".claude/extensions/voice-summary/helpers/"

Copy-Item ".claude/hooks/Generate-VoiceSummary-v2.ps1" `
          ".claude/extensions/voice-summary/helpers/Generate-Summary.ps1"

# 2. voice-config.json 复制到voice-summary/
Copy-Item ".claude/hooks/voice-config.json" `
          ".claude/extensions/voice-summary/config.json"

# 注意：暂时保留hooks/中的原文件作为备份
```

### 阶段3：创建核心文件（30分钟）

需要创建的文件：
1. `.claude/hooks/dispatcher.ps1` - 调度器
2. `.claude/extensions/voice-summary/voice-summary.ps1` - 语音扩展主脚本
3. `.claude/extensions/voice-summary/README.md` - 语音扩展说明
4. `.claude/extensions/rag-memory/rag-memory.ps1` - RAG扩展主脚本
5. `.claude/extensions/rag-memory/config.json` - RAG配置
6. `.claude/extensions/rag-memory/README.md` - RAG扩展说明

（详细代码见下节）

### 阶段4：更新.claude/settings.json（1分钟）

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File \".claude\\hooks\\dispatcher.ps1\""
          }
        ]
      }
    ]
  }
}
```

### 阶段5：测试验证（10分钟）

```powershell
# 1. 测试调度器
.\.claude\hooks\dispatcher.ps1

# 2. 测试语音扩展
.\.claude\extensions\voice-summary\voice-summary.ps1

# 3. 测试RAG扩展
.\.claude\extensions\rag-memory\rag-memory.ps1

# 4. 完整测试：进行一次Claude对话，观察Hook是否正常触发
```

---

## 六、配置说明

### 6.1 语音总结扩展配置

**文件**: `.claude/extensions/voice-summary/config.json`

```json
{
  "enabled": true,
  "ai_model": "qwen2.5:1.5b",
  "max_summary_length": 50,
  "timeout_seconds": 3,
  "voice_enabled": true,
  "voice_rate": 1,
  "fallback_summary": "任务已完成"
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `enabled` | 是否启用此扩展 | `true` |
| `ai_model` | Ollama模型名称 | `qwen2.5:1.5b` |
| `max_summary_length` | 总结最大字数 | `50` |
| `timeout_seconds` | AI超时时间（秒） | `3` |
| `voice_enabled` | 是否启用语音播报 | `true` |
| `voice_rate` | 语音速率（-10到10） | `1` |

### 6.2 RAG记忆扩展配置

**文件**: `.claude/extensions/rag-memory/config.json`

```json
{
  "enabled": true,
  "embedding_model": "nomic-embed-text",
  "enable_entity_extraction": true,
  "enable_vectorization": true,
  "async_processing": true,
  "database_path": "../../../data"
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `enabled` | 是否启用此扩展 | `true` |
| `embedding_model` | Ollama嵌入模型 | `nomic-embed-text` |
| `enable_entity_extraction` | 是否提取实体 | `true` |
| `enable_vectorization` | 是否生成向量 | `true` |
| `async_processing` | 是否异步处理 | `true` |
| `database_path` | 数据库路径（相对路径） | `../../../data` |

---

## 七、使用指南

### 7.1 禁用某个扩展

**方法1：修改配置**
```json
// .claude/extensions/voice-summary/config.json
{
  "enabled": false  // 改为false
}
```

**方法2：删除文件夹**
```powershell
Remove-Item -Recurse -Force .claude/extensions/voice-summary
```

### 7.2 添加新扩展

```powershell
# 1. 创建扩展目录
New-Item -ItemType Directory -Path ".claude/extensions/my-extension"

# 2. 创建主脚本
New-Item -ItemType File -Path ".claude/extensions/my-extension/my-extension.ps1"

# 3. 创建配置
@{enabled=$true} | ConvertTo-Json | Out-File ".claude/extensions/my-extension/config.json"

# 4. 测试：调度器会自动发现并执行
.\.claude\hooks\dispatcher.ps1
```

### 7.3 查看日志

```powershell
# 语音扩展日志
Get-Content .claude/extensions/voice-summary/logs/voice-summary.log -Tail 20

# RAG扩展日志
Get-Content .claude/extensions/rag-memory/logs/rag-memory.log -Tail 20

# 调度器日志（如果启用）
Get-Content .claude/hooks/dispatcher.log -Tail 20
```

### 7.4 手动触发扩展

```powershell
# 不依赖Claude，手动触发扩展

# 触发语音总结
.\.claude\extensions\voice-summary\voice-summary.ps1

# 触发RAG记忆
.\.claude\extensions\rag-memory\rag-memory.ps1
```

---

## 八、FAQ

### Q1: 为什么要用三层架构？

**A**:
- **解耦**：扩展层可以换，核心业务层不变
- **复用**：VectorMemory.psm1可以在非Claude场景下使用
- **维护**：职责清晰，改一个地方不影响其他

### Q2: 如果VectorMemory.psm1更新了，需要改扩展吗？

**A**: 通常不需要。扩展只是薄封装，只要VectorMemory的公共接口不变，扩展就不用改。

### Q3: 可以把这两个扩展复制到其他项目吗？

**A**: 可以！
```powershell
# 复制整个extensions目录
Copy-Item -Recurse .claude/extensions D:\other-project\.claude/

# 但RAG扩展需要确保目标项目有VectorMemory.psm1
```

### Q4: dispatcher.ps1会不会成为性能瓶颈？

**A**: 不会。调度器本身只做：
1. 列出extensions/目录（<1ms）
2. 读取config.json（<1ms/文件）
3. 启动独立进程（异步，不阻塞）

总开销约10-50ms，相比AI处理（几秒）可忽略。

### Q5: 为什么不把VectorMemory.psm1也放到extensions/rag-memory/下？

**A**: 因为VectorMemory是**核心业务逻辑**，不仅仅服务于Claude Hook：
- 可能被scripts/中的独立工具调用
- 可能被其他项目导入
- 应该是"稳定的核心"，而不是"可插拔的扩展"

### Q6: 如果只想要RAG功能，不想要语音，怎么办？

**A**:
```powershell
# 删除voice-summary扩展
Remove-Item -Recurse .claude/extensions/voice-summary

# 或者禁用
# 编辑 .claude/extensions/voice-summary/config.json
# { "enabled": false }
```

### Q7: 如何查看当前启用了哪些扩展？

**A**:
```powershell
# 方法1：查看extensions/目录
Get-ChildItem .claude/extensions -Directory | ForEach-Object {
    $config = Get-Content "$($_.FullName)/config.json" | ConvertFrom-Json
    [PSCustomObject]@{
        Name = $_.Name
        Enabled = $config.enabled
    }
}

# 方法2：运行调度器，观察输出
.\.claude\hooks\dispatcher.ps1
```

---

## 附录A：核心代码模板

### A.1 dispatcher.ps1（调度器）

详见单独文件：`.claude/hooks/dispatcher.ps1`

核心逻辑：
```powershell
$ExtensionsPath = Join-Path $PSScriptRoot "..\extensions"
$EnabledExtensions = Get-ChildItem $ExtensionsPath -Directory

foreach ($Ext in $EnabledExtensions) {
    $ConfigFile = Join-Path $Ext.FullName "config.json"
    $Config = Get-Content $ConfigFile | ConvertFrom-Json -AsHashtable

    if ($Config.enabled -ne $false) {
        $MainScript = Join-Path $Ext.FullName "$($Ext.Name).ps1"

        # 异步执行，不阻塞
        Start-Job -ScriptBlock {
            param($Script, $Cfg)
            & $Script -Config $Cfg
        } -ArgumentList $MainScript, $Config | Out-Null
    }
}
```

### A.2 rag-memory.ps1（RAG扩展主脚本）

详见单独文件：`.claude/extensions/rag-memory/rag-memory.ps1`

核心逻辑：
```powershell
# 1. 提取对话
$Transcript = Get-LatestTranscript
$UserMessage, $ClaudeReply = Extract-Messages $Transcript

# 2. 调用核心模块
Import-Module "../../../modules/VectorMemory.psm1"
$TurnId = Save-ConversationToRAG -User $UserMessage -Assistant $ClaudeReply

# 3. 异步处理
Start-Job {
    Get-TextEmbedding -Text $CombinedText
    Extract-Entities -Text $CombinedText
} | Out-Null
```

---

## 附录B：迁移清单

从旧架构到新架构的文件迁移对照表：

| 旧位置 | 新位置 | 操作 |
|--------|--------|------|
| `.claude/hooks/voice-notification.ps1` | `.claude/hooks/dispatcher.ps1` | 重写 |
| `.claude/hooks/Extract-Messages.ps1` | `.claude/extensions/voice-summary/helpers/` | 移动 |
| `.claude/hooks/Generate-VoiceSummary-v2.ps1` | `.claude/extensions/voice-summary/helpers/Generate-Summary.ps1` | 移动+重命名 |
| `.claude/hooks/voice-config.json` | `.claude/extensions/voice-summary/config.json` | 复制 |
| `modules/VectorMemory.psm1` | **保留不动** | 无 |
| `data/memory.db` | **保留不动** | 无 |

---

## 附录C：.gitignore 更新

在项目根目录的`.gitignore`中添加：

```gitignore
# === Claude扩展数据（运行时生成，不提交） ===
.claude/extensions/*/logs/
.claude/extensions/voice-summary/logs/
.claude/extensions/rag-memory/logs/

# === 个性化配置（不提交，避免覆盖其他开发者配置） ===
.claude/extensions/*/config.local.json
```

---

## 结语

本架构方案（方案C）平衡了以下需求：
- ✅ 功能独立：两个扩展互不干扰
- ✅ 最小改动：保留现有代码结构
- ✅ 易于理解：三层架构，职责清晰
- ✅ 灵活扩展：添加新功能只需新建文件夹

**下一步行动**：
1. 按照"五、实施步骤"逐步操作
2. 测试验证所有功能
3. 根据实际使用反馈调整

**维护建议**：
- 每月review一次extensions/，清理不用的扩展
- 保持VectorMemory.psm1作为稳定核心，不频繁修改
- 新功能优先考虑做成扩展，而不是修改核心

---

**文档版本**: v1.0
**最后更新**: 2025-01-15
**作者**: 壮爸
**反馈**: 有问题请查看FAQ或查看日志文件调试
