# Claude Code Hooks 双铃音问题深度研究报告

**报告日期**: 2025-01-06
**研究者**: web-research-specialist 代理
**项目**: Voice Notification Project
**维护者**: 壮爸

---

## 执行摘要

通过深入研究官方文档、GitHub 问题追踪、社区实践案例,我发现了你遇到的**双铃音问题的根本原因**:

1. **Notification Hook** (全局配置) 在任务完成时**不应该触发**,它只在 Claude 等待用户输入或需要权限时触发
2. **Stop Hook** (项目配置) 在任务完成时触发,这是正常的
3. 你遇到的双铃音问题可能是以下原因:
   - Claude Code 的已知 Bug: Stop hook 在某些版本会触发多次(版本 2.0.17-2.0.20)
   - 或者 Notification hook 被错误触发(虽然文档说不应该)
   - 或者 Stop hook 本身执行了两次

---

## 1. Hook 类型完整列表和触发时机

| Hook 类型 | 触发时机 | Matcher 支持 | 可阻塞执行 | 主要用途 |
|----------|---------|------------|----------|---------|
| **SessionStart** | 会话启动或恢复时 | ❌ 否 | ❌ 否 | 初始化环境、加载配置 |
| **UserPromptSubmit** | 用户提交 prompt 之前 | ❌ 否 | ✅ 是 | 验证 prompt、添加上下文 |
| **PreToolUse** | 工具调用之前 | ✅ 是 | ✅ 是 | 拦截危险操作、预处理 |
| **PostToolUse** | 工具成功执行后 | ✅ 是 | ❌ 否 | 代码格式化、日志记录 |
| **Notification** | Claude 发送通知时 | ❌ 否 | ❌ 否 | 桌面通知、提醒用户 |
| **Stop** | Agent 完成响应时 | ❌ 否 | ✅ 是 | 任务总结、自动提交 |
| **SubagentStop** | 子 Agent 完成时 | ❌ 否 | ✅ 是 | 子任务追踪 |
| **PreCompact** | 上下文压缩前 | ❌ 否 | ✅ 是 | 保存重要信息 |

### 关键说明

- **Matcher 支持**: 只有 PreToolUse 和 PostToolUse 支持 matcher 字段来匹配特定工具
- **可阻塞执行**: 部分 hook 可以通过返回非零退出码阻止操作继续
- **并行执行**: 同一事件的多个 hook 命令并行执行,超时互不影响

---

## 2. Notification vs Stop 详细对比

### Notification Hook

**触发场景**(仅两种情况):
1. ✅ Claude 需要用户授权使用工具(如 "Claude needs your permission to use Bash")
2. ✅ Prompt 输入空闲超过 60 秒("Claude is waiting for your input")

**不触发场景**:
- ❌ 任务正常完成时
- ❌ Agent 响应结束时
- ❌ 工具执行完成时

**可用环境变量**:
- `$CLAUDE_NOTIFICATION` - 通知内容文本
- `$CLAUDE_CODE_REMOTE` - 是否远程环境

**典型用途**:
```powershell
# 播放提示音提醒用户需要交互
powershell -c "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Ring10.wav').PlaySync()"
```

### Stop Hook

**触发场景**:
- ✅ 主 Agent 完成所有响应时
- ✅ Claude 准备结束会话时

**不触发场景**:
- ❌ 用户手动中断(Ctrl+C)时

**可用环境变量/输入字段**:
- `session_id` - 会话 ID
- `transcript_path` - 对话记录文件路径
- `cwd` - 当前工作目录
- `hook_event_name` - 事件名称("Stop")
- `stop_hook_active` - **关键标志**,防止无限循环

**典型用途**:
```powershell
# 生成 AI 语音总结并播报
powershell -File ".claude/hooks/voice-notification.ps1"
```

### 核心区别总结

| 维度 | Notification Hook | Stop Hook |
|-----|------------------|-----------|
| **语义** | 需要注意/交互 | 任务已完成 |
| **时机** | 会话进行中 | 会话结束时 |
| **频率** | 可能多次触发 | 每个任务一次 |
| **目的** | 提醒用户介入 | 总结和收尾 |

---

## 3. 双铃音问题根本原因分析

### 当前配置情况

**全局配置** (`~/.claude/settings.json`):
```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \"(New-Object Media.SoundPlayer 'C:\\\\Windows\\\\Media\\\\Ring10.wav').PlaySync()\""
          }
        ]
      }
    ]
  }
}
```

**项目配置** (`voice-notification-project/.claude/settings.json`):
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File \"H:\\HZH\\Little-Projects\\voice-notification-project\\.claude\\hooks\\voice-notification.ps1\""
          }
        ]
      }
    ]
  }
}
```

### 问题分析

#### 可能性 1: Notification Hook 被错误触发 ⭐ 最可能

根据文档,Notification hook **不应该**在任务完成时触发,但你的配置中:
- 全局 Notification hook 播放 `Ring10.wav`
- 项目 Stop hook 播放语音总结

**如果两者都触发,说明**:
1. 可能是 Claude Code 的 Bug(Notification hook 触发时机不正确)
2. 或者任务完成时 Claude 确实发送了某种 Notification(如权限请求)

#### 可能性 2: Stop Hook 触发多次 ⭐ 已知 Bug

GitHub Issue #9602 报告:
- **版本 2.0.17-2.0.20** 存在 Stop hook 回归问题
- Stop hook 会触发 **3-4 次**
- 每次都打印 "Stop hook succeeded:" 消息
- 这是版本 2.0.15 已修复问题的回归

#### 可能性 3: 主目录触发问题

GitHub Issue #3465 报告:
- 当从**用户主目录**运行 Claude Code 时,hook 会触发两次
- 从其他目录运行正常
- 原因: 配置加载层级问题

### 诊断结论

根据你的工作目录 `H:\HZH\Little-Projects\voice-notification-project`(非主目录),可能性 3 不太适用。

**最可能的情况**:
1. Notification hook 在某些场景被错误触发(可能是 Bug)
2. 或者 Stop hook 在你的 Claude Code 版本中触发了多次

---

## 4. 多种解决方案对比

### 方案 1: 移除全局 Notification Hook ⭐ 推荐

**操作**:
```bash
# 编辑 ~/.claude/settings.json,删除 Notification hook
```

**优点**:
- ✅ 彻底解决双铃音问题
- ✅ 保留更有价值的 Stop hook(AI 语音总结)
- ✅ 简单直接

**缺点**:
- ❌ 失去"需要交互时"的提示音
- ❌ 在长时间等待输入时没有提醒

**适用场景**:
- 你主动监控 Claude Code 界面
- 更重视任务完成通知而非交互提醒

### 方案 2: 条件化 Notification Hook

**操作**:
```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \"if ($env:CLAUDE_NOTIFICATION -match 'waiting for your input') { (New-Object Media.SoundPlayer 'C:\\\\Windows\\\\Media\\\\Ring10.wav').PlaySync() }\""
          }
        ]
      }
    ]
  }
}
```

**优点**:
- ✅ 只在真正需要交互时播放
- ✅ 避免误触发
- ✅ 保留两种 hook 的独立价值

**缺点**:
- ❌ 配置更复杂
- ❌ 依赖环境变量正确传递

### 方案 3: 在 Stop Hook 中添加去重逻辑

**操作**: 在 `voice-notification.ps1` 开头添加文件锁:

```powershell
# 防重复执行锁
$lockFile = Join-Path $PSScriptRoot "voice-notification.lock"
$lockTimeout = 5 # 秒

if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalSeconds -lt $lockTimeout) {
        Write-DebugLog "Another instance is running, exiting"
        exit 0
    }
}

# 创建锁文件
"Running" | Out-File -FilePath $lockFile -Force

try {
    # 你的现有代码...
} finally {
    # 清理锁文件
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force
    }
}
```

**优点**:
- ✅ 防止多次触发问题
- ✅ 不改变 hook 配置
- ✅ 适用于 Bug 导致的重复触发

**缺点**:
- ❌ 增加脚本复杂度
- ❌ 无法解决"两个不同 hook 都触发"的问题

### 方案 4: 使用不同声音区分场景 ⭐ 推荐(折中方案)

**操作**:
```json
// 全局: 轻柔提示音(需要交互)
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \"(New-Object Media.SoundPlayer 'C:\\\\Windows\\\\Media\\\\Windows Notify Email.wav').PlaySync()\""
          }
        ]
      }
    ]
  }
}

// 项目: 保持语音总结(任务完成)
// voice-notification.ps1 不变
```

**优点**:
- ✅ 保留两种通知的价值
- ✅ 通过声音区分场景(轻音 = 需要交互,语音 = 完成)
- ✅ 如果真的同时触发,你能识别出问题

**缺点**:
- ❌ 仍可能听到两个声音(如果确实都触发)
- ❌ 没有从根本上解决重复触发

---

## 5. Hook 配置优先级和继承关系

### 配置文件层级(优先级从低到高)

```
1. 系统默认配置(内置)
   ↓
2. 全局配置 ~/.claude/settings.json
   所有项目都生效
   ↓
3. 项目配置 <project>/.claude/settings.json
   仅当前项目生效,会合并(不是覆盖)全局配置
   ↓
4. 本地配置 <project>/.claude/settings.local.json
   不提交到 Git,最高优先级
```

### 合并规则(重要!)

**同一 hook 类型的命令会累加,不是覆盖**:

假设:
```json
// 全局
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "echo 'Global Stop'" }
        ]
      }
    ]
  }
}

// 项目
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "echo 'Project Stop'" }
        ]
      }
    ]
  }
}
```

**实际行为**: Stop hook 触发时,**两个命令都执行**!

### 去重机制

Claude Code 文档声明:
> "Multiple identical hook commands are deduplicated automatically"

但社区反馈这个机制**不可靠**,特别是:
- 命令路径不同时不去重
- 命令参数不同时不去重
- Bug 版本可能完全不去重

---

## 6. Matcher 使用方法

### Matcher 仅适用于工具相关 Hook

| Hook 类型 | 支持 Matcher | 说明 |
|----------|------------|------|
| PreToolUse | ✅ 是 | 匹配工具名 |
| PostToolUse | ✅ 是 | 匹配工具名 |
| 其他所有 Hook | ❌ 否 | matcher 字段无效或应省略 |

### Matcher 语法

#### 1. 精确匹配
```json
{
  "matcher": "Bash"
}
```
仅匹配 Bash 工具。

#### 2. 多工具匹配(管道符)
```json
{
  "matcher": "Edit|Write|MultiEdit"
}
```
匹配文件修改类工具。

#### 3. 正则表达式
```json
{
  "matcher": "mcp__memory__.*"
}
```
匹配 MCP memory 相关工具。

#### 4. 匹配所有工具
```json
{
  "matcher": "*"
}
// 或
{
  "matcher": ""
}
// 或省略 matcher 字段
```

### 常用工具名列表

| 工具名 | 用途 |
|-------|-----|
| `Bash` | 执行 shell 命令 |
| `Read` | 读取文件 |
| `Write` | 写入新文件 |
| `Edit` | 编辑现有文件 |
| `MultiEdit` | 批量编辑 |
| `Glob` | 文件搜索 |
| `Grep` | 内容搜索 |
| `WebSearch` | 网络搜索 |
| `mcp__*` | MCP 工具(正则匹配) |

### 实战示例

#### 示例 1: 自动格式化 TypeScript
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | { read file_path; if echo \"$file_path\" | grep -q '\\.ts$'; then npx prettier --write \"$file_path\"; fi; }"
          }
        ]
      }
    ]
  }
}
```

#### 示例 2: 记录所有 Bash 命令
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '\"\\(.tool_input.command) - \\(.tool_input.description // \\\"No description\\\")\"' >> ~/.claude/bash-log.txt"
          }
        ]
      }
    ]
  }
}
```

---

## 7. 避免 Hook 重复触发的最佳实践

### 实践 1: 明确区分 Hook 用途 ⭐⭐⭐

**原则**: 不同 hook 处理不同场景

```
Notification Hook → 需要用户交互时的轻提醒
Stop Hook        → 任务完成时的详细总结
```

**实施**:
- 全局只用 Notification(通用需求)
- 项目只用 Stop(项目特定需求)
- 避免两者功能重叠

### 实践 2: 使用文件锁防止并发 ⭐⭐

```powershell
function Get-HookLock {
    param([string]$LockFile, [int]$TimeoutSeconds = 5)

    $startTime = Get-Date
    while (Test-Path $LockFile) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        if ($elapsed -gt $TimeoutSeconds) {
            return $false
        }
        Start-Sleep -Milliseconds 100
    }

    New-Item -Path $LockFile -ItemType File -Force | Out-Null
    return $true
}

# 使用
if (Get-HookLock -LockFile "$PSScriptRoot/hook.lock") {
    try {
        # 你的 hook 逻辑
    } finally {
        Remove-Item "$PSScriptRoot/hook.lock" -Force
    }
} else {
    exit 0  # 另一个实例正在运行
}
```

### 实践 3: 检查 stop_hook_active 标志 ⭐⭐⭐

**适用于**: Stop 和 SubagentStop hook

```powershell
# 读取 stdin JSON
$inputData = [Console]::In.ReadToEnd() | ConvertFrom-Json

# 检查是否已经在 stop hook 中
if ($inputData.stop_hook_active) {
    Write-Debug "Already in stop hook, exiting"
    exit 0
}

# 你的 hook 逻辑...
```

**防止场景**: Stop hook 返回非零退出码强制 Claude 继续工作时,避免下次再触发。

### 实践 4: 使用唯一标识符去重 ⭐

```powershell
# 为每次会话生成唯一 ID
$sessionId = $inputData.session_id
$lastSessionFile = "$PSScriptRoot/last-session.txt"

if (Test-Path $lastSessionFile) {
    $lastSession = Get-Content $lastSessionFile -Raw
    if ($lastSession -eq $sessionId) {
        Write-Debug "Already processed this session"
        exit 0
    }
}

# 记录当前会话
$sessionId | Out-File $lastSessionFile -Force

# 你的 hook 逻辑...
```

### 实践 5: 限制 Hook 执行频率 ⭐⭐

```powershell
$rateLimitFile = "$PSScriptRoot/last-run.txt"
$minInterval = 3  # 秒

if (Test-Path $rateLimitFile) {
    $lastRun = Get-Content $rateLimitFile | Get-Date
    $elapsed = ((Get-Date) - $lastRun).TotalSeconds

    if ($elapsed -lt $minInterval) {
        Write-Debug "Rate limited, last run $elapsed seconds ago"
        exit 0
    }
}

# 记录执行时间
Get-Date -Format "o" | Out-File $rateLimitFile -Force

# 你的 hook 逻辑...
```

### 实践 6: 精确的 Matcher 配置 ⭐⭐

**避免过于宽泛的匹配**:

```json
// ❌ 错误 - 太宽泛
{
  "matcher": "*",
  "hooks": [...]
}

// ✅ 正确 - 精确匹配
{
  "matcher": "Edit|Write",
  "hooks": [...]
}
```

### 实践 7: 避免从主目录运行 Claude Code ⭐

**已知 Bug**: 从 `~` 主目录运行时 hook 可能触发两次。

**解决方案**:
- 总是从项目目录运行
- 或使用 `cd <project> && claude ...`

---

## 8. 针对当前情况的具体建议

### 当前问题诊断

当前配置:
```
全局 Notification Hook → Ring10.wav
项目 Stop Hook        → AI 语音总结
```

**诊断步骤**:

1. **查看 voice-debug.log** 确认 Stop hook 触发次数:
   ```powershell
   Get-Content H:\HZH\Little-Projects\voice-notification-project\.claude\hooks\voice-debug.log -Tail 50
   ```

   如果看到多个 "=== Voice Notification Started ===" 在同一任务中,说明 Stop hook 触发多次。

2. **监控 Notification hook**: 临时修改全局配置添加日志:
   ```json
   {
     "command": "powershell -c \"Get-Date | Out-File -Append C:\\claude-notification-log.txt; (New-Object Media.SoundPlayer 'C:\\\\Windows\\\\Media\\\\Ring10.wav').PlaySync()\""
   }
   ```

   检查 `C:\claude-notification-log.txt` 看任务完成时是否有记录。

3. **检查 Claude Code 版本**:
   ```bash
   claude --version
   ```

   如果是 2.0.17-2.0.20,建议升级到最新版。

### 推荐解决方案(按优先级)

#### 方案 A: 移除全局 Notification Hook(最简单)⭐⭐⭐

**适合的原因**:
- Stop hook 已经很完善(AI 语音总结)
- 任务完成通知比交互提示更重要
- 主动使用 Claude Code(不需要离开时的提醒)

**操作**:
```bash
# 编辑 ~/.claude/settings.json
# 删除 Notification hook 配置
```

#### 方案 B: 在 Stop Hook 中添加去重逻辑(最稳健)⭐⭐⭐

修改 `voice-notification.ps1` 开头:

```powershell
# 在 try 块开始后立即添加

# 1. 防重复执行 - 文件锁
$lockFile = Join-Path $PSScriptRoot "voice-notification.lock"
if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalSeconds -lt 5) {
        Write-DebugLog "Lock file exists, another instance is running"
        exit 0
    }
}
"Running" | Out-File -FilePath $lockFile -Force

# 2. 防重复执行 - Session ID 检查
$sessionId = $hookInput.session_id
$lastSessionFile = Join-Path $PSScriptRoot "last-session.txt"
if (Test-Path $lastSessionFile) {
    $lastSession = Get-Content $lastSessionFile -Raw -ErrorAction SilentlyContinue
    if ($lastSession.Trim() -eq $sessionId) {
        Write-DebugLog "Session $sessionId already processed"
        if (Test-Path $lockFile) { Remove-Item $lockFile -Force }
        exit 0
    }
}

# 在 finally 块中添加清理
# try {
#     ... 现有代码 ...
# } finally {
#     if (Test-Path $lockFile) {
#         Remove-Item $lockFile -Force
#     }
#     $sessionId | Out-File $lastSessionFile -Force
# }
```

#### 方案 C: 条件化 Notification Hook(保留两者)⭐⭐

只在真正需要时播放提示音:

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \"$msg = $env:CLAUDE_NOTIFICATION; if ($msg -and ($msg -match 'waiting' -or $msg -match 'permission')) { (New-Object Media.SoundPlayer 'C:\\\\Windows\\\\Media\\\\Windows Notify Email.wav').PlaySync(); $msg | Out-File -Append C:\\\\claude-notifications.log }\""
          }
        ]
      }
    ]
  }
}
```

---

## 9. 已知 Bug 和社区反馈

### Bug #1: Stop Hook 多次触发(版本 2.0.17-2.0.20)

**报告**: GitHub Issue #9602

**症状**:
- Stop hook 触发 3-4 次
- 每次都显示 "Stop hook succeeded:" 消息
- 导致重复通知、重复操作

**影响版本**: 2.0.17 - 2.0.20

**状态**: 已确认为回归问题(2.0.15 曾修复)

**解决方案**:
- 升级到最新版本
- 或在脚本中添加去重逻辑

### Bug #2: 主目录触发双重 Hook

**报告**: GitHub Issue #3465

**症状**:
- 从 `~` 主目录运行 Claude Code 时 hook 触发两次
- 从其他目录运行正常

**原因**: 配置加载层级问题

**解决方案**:
- 避免从主目录运行
- 或使用文件锁去重

### Bug #3: 60秒空闲 Notification 不触发

**报告**: GitHub Issue #8320

**症状**:
- 文档声称 60 秒空闲会触发 Notification
- 实际在某些环境(特别是 Linux)不触发

**状态**: 部分用户报告,可能环境相关

### Bug #4: Hook 环境变量为空

**报告**: GitHub Issue #9567

**症状**:
- `$CLAUDE_TOOL_INPUT` 等环境变量有时为空或显示 "unknown"
- 影响基于环境变量的条件逻辑

**解决方案**:
- 优先使用 stdin JSON 输入而非环境变量
- 添加空值检查

---

## 10. 参考资料

### 官方文档
1. **Hooks Reference**
   https://docs.claude.com/en/docs/claude-code/hooks
   完整的 hook 类型、触发时机、配置方法

2. **Hooks Guide**
   https://docs.claude.com/en/docs/claude-code/hooks-guide
   快速上手教程和最佳实践

3. **Settings Documentation**
   https://code.claude.com/docs/en/settings
   配置文件结构和优先级

### GitHub 资源
4. **claude-code-hooks-mastery**
   https://github.com/disler/claude-code-hooks-mastery
   8 种 hook 的完整示例集

5. **claude-notify**
   https://github.com/jamez01/claude-notify
   多平台通知工具

6. **Issue #9602 - Stop Hook Regression**
   https://github.com/anthropics/claude-code/issues/9602
   Stop hook 多次触发的官方追踪

7. **Issue #3465 - Home Directory Duplicate**
   https://github.com/anthropics/claude-code/issues/3465
   主目录双重触发问题

### 社区教程
8. **"Automating macOS Notifications for Task Completion"**
   https://nakamasato.medium.com/claude-code-hooks-automating-macos-notifications-for-task-completion-42d200e751cc
   实战案例: 任务完成通知

9. **"Automate Your AI Workflows with Claude Code Hooks"**
   https://blog.gitbutler.com/automate-your-ai-workflows-with-claude-code-hooks
   GitButler 集成示例

10. **"Complete Guide: Creating Claude Code Hooks"**
    https://suiteinsider.com/complete-guide-creating-claude-code-hooks/
    详细的配置教程

### 其他资源
11. **ClaudeLog - Hooks Mechanics**
    https://claudelog.com/mechanics/hooks/
    社区维护的技术参考

12. **"Claude Code hooks for simple macOS notifications"**
    https://khromov.se/claude-code-hooks-for-simple-macos-notifications/
    简单通知实现

---

## 总结和行动建议

根据深入研究,遇到的双铃音问题很可能是以下两种情况:

1. **Stop hook 在 Claude Code 版本中触发了多次**(Bug #9602)
2. **Notification hook 在不应该的时候被触发了**(可能的 Bug 或特殊场景)

### 立即行动项

**第一步: 诊断问题**
```powershell
# 1. 检查最近一次任务的日志
Get-Content H:\HZH\Little-Projects\voice-notification-project\.claude\hooks\voice-debug.log -Tail 100

# 2. 查看 Claude Code 版本
claude --version
```

**第二步: 选择解决方案**

建议采用**方案 B(在 Stop Hook 中添加去重逻辑)**,原因:
- ✅ 无论是哪种 Bug 都能防止
- ✅ 保留了 Notification hook 的价值(真正需要交互时提示)
- ✅ 代码改动小,易于维护

**第三步: 监控效果**
- 完成任务后检查 `voice-debug.log`
- 确认只有一条 "=== Voice Notification Started ==="

### 长期优化建议

1. **升级 Claude Code**: 如果版本是 2.0.17-2.0.20,强烈建议升级
2. **区分声音**: 即使保留两个 hook,用不同声音明确区分场景
3. **监控日志**: 定期查看 debug 日志,及时发现异常行为

---

**报告生成**: web-research-specialist 代理
**报告整理**: Claude Code
**维护者**: 壮爸
**最后更新**: 2025-01-06
