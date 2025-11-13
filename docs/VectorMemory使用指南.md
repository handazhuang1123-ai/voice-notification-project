# VectorMemory 向量记忆系统使用指南

## 📋 简介

VectorMemory 是一个基于 SQLite + sqlite-vec + Ollama 的本地化向量记忆系统，为语音通知项目提供自我进化能力。

**核心特性**：
- ✅ **完全本地化** - 所有数据和计算在本地完成
- ✅ **语义搜索** - 基于向量相似度的智能检索
- ✅ **自适应学习** - 根据历史交互生成个性化提示词
- ✅ **轻量级** - 资源占用 < 50MB
- ✅ **渐进式进化** - 随时间积累逐步个性化

---

## 🚀 快速开始

### 1. 前置条件

确保已完成依赖安装（参考 `docs/手动安装SQLite依赖指南.md`）：

```
lib/
├── System.Data.SQLite.dll      (必需)
├── vec0.dll                     (可选，用于向量搜索)
└── x64/
    └── SQLite.Interop.dll      (必需)
```

Ollama 已安装并运行：
```powershell
ollama list  # 确认 nomic-embed-text 模型存在
```

### 2. 初始化数据库

```powershell
# 运行初始化脚本
.\scripts\Initialize-MemoryDatabase.ps1

# 可选：添加示例数据
.\scripts\Initialize-MemoryDatabase.ps1  # 根据提示选择添加样本
```

### 3. 运行测试

```powershell
# 运行完整测试套件
.\tests\Test-VectorMemory.ps1

# 保留测试数据库用于检查
.\tests\Test-VectorMemory.ps1 -KeepDatabase
```

---

## 📚 核心功能使用

### 功能 1：初始化记忆系统

```powershell
# 导入模块
Import-Module .\modules\VectorMemory.psm1 -Force

# 初始化数据库连接
$connection = Initialize-VectorMemory -DatabasePath ".\data\memory.db"
```

### 功能 2：保存交互记忆

```powershell
# 保存一次交互
$interactionId = Add-VectorMemory `
    -Connection $connection `
    -UserMessage "创建用户手册" `
    -AiSummary "壮爸，用户手册已创建完成" `
    -EmotionStyle "calm"

Write-Host "Saved interaction ID: $interactionId"
```

**说明**：
- `UserMessage`：用户的原始消息或命令
- `AiSummary`：AI 生成的总结文本
- `EmotionStyle`：使用的情感风格（calm、celebrate、error 等）
- 函数会自动生成嵌入向量并存储

### 功能 3：语义搜索

```powershell
# 查找相似的历史交互
$similarMemories = Find-SimilarMemories `
    -Connection $connection `
    -QueryText "如何生成文档" `
    -TopK 3

# 显示结果
foreach ($memory in $similarMemories) {
    Write-Host "[$([math]::Round($memory.Similarity, 2))] $($memory.UserMessage)"
    Write-Host "  回复: $($memory.AiSummary)"
    Write-Host ""
}
```

**输出示例**：
```
[0.87] 创建用户手册
  回复: 壮爸，用户手册已创建完成

[0.75] 编写API文档
  回复: 壮爸，API文档已完成

[0.62] 更新开发者指南
  回复: 壮爸，开发者指南已更新
```

### 功能 4：生成自适应提示词

```powershell
# 根据历史记忆生成增强提示词
$adaptivePrompt = Get-AdaptivePrompt `
    -Connection $connection `
    -CurrentMessage "更新API文档" `
    -TopK 3

# 使用增强提示词调用 Ollama
$body = @{
    model  = "qwen2.5:1.5b"
    prompt = $adaptivePrompt
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" `
    -Method Post -Body $body -ContentType "application/json"
```

**生成的提示词示例**：
```
你是壮爸的个性化AI助手。根据以下历史互动风格生成总结:

【历史相似场景】
- 用户: 创建用户手册
  回复: 壮爸，用户手册已创建完成 (相似度: 0.87)
- 用户: 编写API文档
  回复: 壮爸，API文档已完成 (相似度: 0.75)

【用户偏好】
- 最常使用的情感风格: calm

【当前消息】
更新API文档

请生成一个60字以内的语音播报总结，保持个性化风格。
```

### 功能 5：获取统计信息

```powershell
# 获取记忆统计
$stats = Get-MemoryStatistics -Connection $connection

Write-Host "Total Interactions: $($stats.TotalInteractions)"
Write-Host "Total Embeddings: $($stats.TotalEmbeddings)"
Write-Host "Most Used Emotion: $($stats.MostUsedEmotion)"
Write-Host "Last Interaction: $($stats.LastInteraction)"
```

---

## 🔗 集成到语音通知系统

### 方案A：在主脚本中集成

修改 `.claude/hooks/voice-notification.ps1`：

```powershell
# 在脚本开头导入模块
Import-Module (Join-Path $PSScriptRoot '..\..\modules\VectorMemory.psm1') -Force

# 初始化记忆连接（脚本启动时）
$script:MemoryConnection = $null
try {
    $script:MemoryConnection = Initialize-VectorMemory
    Write-Host "✓ VectorMemory initialized" -ForegroundColor Green
}
catch {
    Write-Warning "VectorMemory initialization failed: $_"
}

# 在生成AI总结前（第1步：获取自适应提示词）
if ($script:MemoryConnection) {
    $adaptivePrompt = Get-AdaptivePrompt `
        -Connection $script:MemoryConnection `
        -CurrentMessage $UserMessage `
        -TopK 3
}
else {
    $adaptivePrompt = $UserMessage
}

# 调用 Ollama 生成总结（使用增强提示词）
$aiSummary = Invoke-OllamaGenerate -Prompt $adaptivePrompt

# 在保存日志后（第2步：保存记忆）
if ($script:MemoryConnection -and $aiSummary) {
    try {
        Add-VectorMemory `
            -Connection $script:MemoryConnection `
            -UserMessage $UserMessage `
            -AiSummary $aiSummary `
            -EmotionStyle $EmotionStyle
    }
    catch {
        Write-Warning "Failed to save memory: $_"
    }
}

# 脚本结束时关闭连接
if ($script:MemoryConnection) {
    $script:MemoryConnection.Close()
}
```

### 方案B：创建包装函数

创建 `.claude/hooks/VectorMemory-Wrapper.ps1`：

```powershell
<#
.SYNOPSIS
    Wrapper functions for easy VectorMemory integration
    VectorMemory 简易集成包装函数
#>

$script:MemoryConn = $null

function Start-VectorMemory {
    if (-not $script:MemoryConn) {
        $modulePath = Join-Path $PSScriptRoot '..\..\modules\VectorMemory.psm1'
        Import-Module $modulePath -Force

        $script:MemoryConn = Initialize-VectorMemory
        Write-Host "✓ VectorMemory started" -ForegroundColor Green
    }
}

function Stop-VectorMemory {
    if ($script:MemoryConn) {
        $script:MemoryConn.Close()
        $script:MemoryConn = $null
        Write-Host "✓ VectorMemory stopped" -ForegroundColor Green
    }
}

function Get-EnhancedPrompt {
    param([string]$Message)

    if ($script:MemoryConn) {
        return Get-AdaptivePrompt -Connection $script:MemoryConn -CurrentMessage $Message
    }
    return $Message
}

function Save-InteractionMemory {
    param(
        [string]$UserMessage,
        [string]$AiSummary,
        [string]$EmotionStyle = 'calm'
    )

    if ($script:MemoryConn) {
        Add-VectorMemory -Connection $script:MemoryConn `
            -UserMessage $UserMessage `
            -AiSummary $AiSummary `
            -EmotionStyle $EmotionStyle
    }
}
```

在主脚本中使用：

```powershell
# 导入包装函数
. (Join-Path $PSScriptRoot 'VectorMemory-Wrapper.ps1')

# 启动
Start-VectorMemory

# 使用
$enhancedPrompt = Get-EnhancedPrompt -Message $UserMessage
$aiSummary = Invoke-OllamaGenerate -Prompt $enhancedPrompt
Save-InteractionMemory -UserMessage $UserMessage -AiSummary $aiSummary -EmotionStyle $emotion

# 结束
Stop-VectorMemory
```

---

## 📊 监控和维护

### 查看数据库内容

```powershell
# 使用 SQLite CLI
sqlite3 .\data\memory.db

# 查看交互记录
SELECT id, timestamp, user_message, emotion_style FROM interactions ORDER BY timestamp DESC LIMIT 10;

# 查看情感统计
SELECT * FROM emotion_stats ORDER BY count DESC;

# 查看数据库大小
.databases
```

### 备份数据库

```powershell
# 手动备份
Copy-Item .\data\memory.db .\data\memory.backup.$(Get-Date -Format 'yyyyMMdd').db

# 定期备份脚本（添加到计划任务）
$backupPath = ".\data\backups\memory.$(Get-Date -Format 'yyyyMMdd-HHmmss').db"
Copy-Item .\data\memory.db $backupPath
```

### 性能优化

```powershell
# 定期 VACUUM（压缩数据库）
$connection = Initialize-VectorMemory
$command = $connection.CreateCommand()
$command.CommandText = "VACUUM;"
$command.ExecuteNonQuery()
$connection.Close()

# 重建索引
$command.CommandText = "REINDEX;"
$command.ExecuteNonQuery()
```

---

## 🐛 故障排除

### 问题1：DLL 加载失败

**错误信息**：
```
System.Data.SQLite.dll not found
```

**解决方案**：
1. 检查 `lib\` 目录是否包含所需 DLL
2. 确认 `lib\x64\SQLite.Interop.dll` 存在
3. 参考 `docs/手动安装SQLite依赖指南.md` 重新下载

### 问题2：Ollama 连接失败

**错误信息**：
```
Failed to generate embedding: Unable to connect to remote server
```

**解决方案**：
1. 确认 Ollama 服务运行中：
   ```powershell
   ollama list
   ```
2. 检查 API 端口：
   ```powershell
   curl http://localhost:11434/api/version
   ```
3. 拉取嵌入模型：
   ```powershell
   ollama pull nomic-embed-text
   ```

### 问题3：向量搜索不工作

**错误信息**：
```
vec0.dll not found, vector search disabled
```

**解决方案**：
1. 下载 sqlite-vec 扩展：https://github.com/asg017/sqlite-vec/releases
2. 将 `vec0.dll` 放到 `lib\` 目录
3. 重新运行 `Initialize-VectorMemory`

**备用方案**：
- 即使没有 vec0.dll，系统仍可使用 PowerShell 计算余弦相似度
- 性能会稍慢，但功能完整

### 问题4：数据库锁定

**错误信息**：
```
database is locked
```

**解决方案**：
1. 确认没有其他进程打开数据库
2. 关闭所有数据库连接
3. 检查是否有 `.db-wal` 或 `.db-shm` 文件，尝试删除

---

## 📈 演进路径

### 当前阶段（0-6个月）
- ✅ 基础向量存储和检索
- ✅ 简单的情感偏好统计
- ✅ 上下文增强提示词

### 第二阶段（6-12个月）
- 🔄 数据积累到 500+ 条
- 🔄 优化向量检索算法
- 🔄 实现遗忘曲线机制

### 第三阶段（1-2年）
- 🔜 数据积累到 2000+ 条
- 🔜 自动偏好变化检测
- 🔜 语义去重和记忆合并

### 长期阶段（2年+）
- 🔜 考虑升级到 Mem0（如果需要高级特性）
- 🔜 实现多级记忆系统
- 🔜 主动学习和优化建议

---

## 📞 技术支持

**文档**：
- 调研报告：`docs/自我进化技术方案调研报告.md`
- 依赖安装：`docs/手动安装SQLite依赖指南.md`

**测试**：
- 完整测试：`.\tests\Test-VectorMemory.ps1`
- 初始化测试：`.\scripts\Initialize-MemoryDatabase.ps1`

**模块源码**：
- VectorMemory 模块：`modules\VectorMemory.psm1`

**问题反馈**：
- 检查日志：系统会输出详细的调试信息
- 使用 `-Verbose` 参数查看详细日志

---

## 🎓 最佳实践

### 1. 定期备份
建议每周备份一次 `memory.db`

### 2. 监控数据库大小
```powershell
Get-Item .\data\memory.db | Select-Object Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}}
```

### 3. 合理设置 TopK 参数
- 少量数据（< 100条）：TopK = 3
- 中量数据（100-500条）：TopK = 5
- 大量数据（> 500条）：TopK = 5-10

### 4. 定期检查向量质量
运行测试脚本验证语义搜索准确性

### 5. 逐步集成
先在测试环境验证，再集成到生产脚本

---

**作者**：壮爸
**版本**：1.0
**更新日期**：2025-01-13
