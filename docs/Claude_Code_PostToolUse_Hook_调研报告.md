# Claude Code PostToolUse Hook 深度调研报告

**调研日期**: 2025-01-06
**调研人**: 壮爸
**版本**: 1.0

---

## 目录

1. [执行摘要](#执行摘要)
2. [PostToolUse Hook 工作机制](#posttooluse-hook-工作机制)
3. [环境变量详解](#环境变量详解)
4. [获取文件路径的方法](#获取文件路径的方法)
5. [Hook 输出可见性与调试](#hook-输出可见性与调试)
6. [最佳实践与示例代码](#最佳实践与示例代码)
7. [已知问题与局限性](#已知问题与局限性)
8. [参考资源](#参考资源)

---

## 执行摘要

**关键发现**：

1. **PostToolUse hook** 在工具成功执行后立即运行，接收工具的输入和输出数据
2. **环境变量命名澄清**：官方文档使用 `$CLAUDE_TOOL_OUTPUT`（不是 CLAUDE_TOOL_RESULT）
3. **文件路径获取**：通过 `$CLAUDE_FILE_PATHS` 环境变量或解析 stdin JSON 的 `tool_input.file_path`
4. **输出可见性**：stdout 对用户可见（Ctrl-R 查看），但 Claude 看不到；stderr 可用于提供反馈给 Claude
5. **调试方法**：使用 `claude --debug`、日志文件、或 `/hooks` 命令

**重要提示**：截至 2025 年初，环境变量存在已知 bug（可能为空或 "unknown"），建议优先使用 stdin JSON 解析。

---

## PostToolUse Hook 工作机制

### 1. 执行时机

PostToolUse hook 在工具**成功完成**后立即执行：

```
用户请求 → Claude 决策 → 工具执行 → [PostToolUse Hook] → 结果返回给用户
```

**关键特征**：
- ✅ 工具已经执行完毕，无法阻止或撤销
- ✅ 可以访问工具的输入参数和输出结果
- ✅ 可以通过 `exit code 2` + stderr 向 Claude 提供反馈，影响后续操作
- ✅ 支持通过 matcher 过滤特定工具（如 `Write|Edit|Bash`）

### 2. 配置方式

在 `.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use.ps1"
          }
        ]
      }
    ]
  }
}
```

**Matcher 规则**：
- 使用 `|` 分隔多个工具名（如 `Write|Edit|Bash`）
- 使用 `*` 匹配所有工具
- 大小写敏感（必须精确匹配工具名）

### 3. 输入数据来源

PostToolUse hook 接收两种数据：

#### 方式 1：环境变量（存在 bug）
- `$CLAUDE_TOOL_OUTPUT` - 工具的输出结果
- `$CLAUDE_FILE_PATHS` - 空格分隔的文件路径列表
- `$CLAUDE_TOOL_NAME` - 工具名称
- `$CLAUDE_TOOL_INPUT` - 工具输入的 JSON 字符串

#### 方式 2：stdin JSON（推荐）
Hook 通过 stdin 接收完整的 JSON 数据：

```json
{
  "session_id": "session-123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/project/root",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ps1",
    "old_string": "...",
    "new_string": "..."
  },
  "tool_output": "Edit successful"
}
```

---

## 环境变量详解

### 完整环境变量列表

| 环境变量 | 可用阶段 | 说明 | 示例值 |
|---------|---------|------|--------|
| `$CLAUDE_TOOL_OUTPUT` | PostToolUse | 工具的输出结果 | `"Edit successful"` |
| `$CLAUDE_FILE_PATHS` | Pre/PostToolUse | 空格分隔的文件路径 | `"/path/file1.ps1 /path/file2.ps1"` |
| `$CLAUDE_TOOL_NAME` | Pre/PostToolUse | 工具名称 | `"Write"`, `"Edit"`, `"Bash"` |
| `$CLAUDE_TOOL_INPUT` | Pre/PostToolUse | 工具输入的 JSON | `'{"file_path":"/path/to/file"}'` |
| `$CLAUDE_EVENT_TYPE` | 所有 | 事件类型 | `"PostToolUse"` |
| `$CLAUDE_PROJECT_DIR` | 所有 | 项目根目录 | `"/project/root"` |
| `$CLAUDE_CODE_REMOTE` | 所有 | 是否为远程环境 | `"true"` 或空 |

### 重要提示：环境变量 Bug

**已知问题** (Issue #9567)：在某些情况下，所有 hook 环境变量都可能为空或 "unknown"。

**解决方案**：优先使用 stdin JSON 解析（见下节）。

---

## 获取文件路径的方法

### 方法 1：使用 $CLAUDE_FILE_PATHS（最简单）

```powershell
# PowerShell 示例
$FilePaths = $env:CLAUDE_FILE_PATHS -split ' '
foreach ($File in $FilePaths) {
    Write-Output "Processing: $File"
    # 对每个文件执行操作
}
```

```bash
# Bash 示例
for file in $CLAUDE_FILE_PATHS; do
    echo "Processing: $file"
    # 处理文件
done
```

**优点**：简单直接
**缺点**：受环境变量 bug 影响

### 方法 2：解析 stdin JSON（推荐）

#### PowerShell 实现

```powershell
# 从 stdin 读取 JSON
$InputJson = [Console]::In.ReadToEnd()

if ($InputJson) {
    $Data = $InputJson | ConvertFrom-Json

    # 提取文件路径
    $FilePath = $Data.tool_input.file_path

    # 提取其他信息
    $ToolName = $Data.tool_name
    $ToolOutput = $Data.tool_output

    Write-Output "Tool: $ToolName"
    Write-Output "File: $FilePath"
    Write-Output "Output: $ToolOutput"
}
```

#### Bash + jq 实现

```bash
#!/bin/bash

# 读取 stdin JSON
input_json=$(cat)

# 使用 jq 提取字段
tool_name=$(echo "$input_json" | jq -r '.tool_name // "unknown"')
file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // empty')
tool_output=$(echo "$input_json" | jq -r '.tool_output // ""')

echo "Tool: $tool_name"
echo "File: $file_path"
echo "Output: $tool_output"
```

#### Python 实现

```python
#!/usr/bin/env python3
import json
import sys

# 从 stdin 读取 JSON
input_data = json.load(sys.stdin)

# 提取数据
tool_name = input_data.get('tool_name', 'unknown')
tool_input = input_data.get('tool_input', {})
file_path = tool_input.get('file_path', '')
tool_output = input_data.get('tool_output', '')

print(f"Tool: {tool_name}")
print(f"File: {file_path}")
print(f"Output: {tool_output}")
```

### 方法 3：条件文件类型处理

```bash
#!/bin/bash

# 检查文件扩展名并执行相应操作
for file in $CLAUDE_FILE_PATHS; do
    if [[ "$file" =~ \.(ts|tsx)$ ]]; then
        # TypeScript 文件：运行 prettier
        prettier --write "$file"
    elif [[ "$file" =~ \.py$ ]]; then
        # Python 文件：运行 black
        black "$file"
    elif [[ "$file" =~ \.ps1$ ]]; then
        # PowerShell 文件：运行 PSScriptAnalyzer
        Invoke-ScriptAnalyzer -Path "$file" -Fix
    fi
done
```

---

## Hook 输出可见性与调试

### 输出可见性规则

| 输出流 | 用户可见 | Claude 可见 | 说明 |
|-------|---------|------------|------|
| **stdout** | ✅ 是（Ctrl-R） | ❌ 否 | 显示在 transcript view |
| **stderr** (exit 0/1) | ✅ 是 | ❌ 否 | 错误消息显示给用户 |
| **stderr** (exit 2) | ✅ 是 | ✅ 是 | **反馈给 Claude 处理** |

### Exit Code 行为

#### Exit Code 0（成功）
```bash
#!/bin/bash
echo "Operation successful" # 用户可见（Ctrl-R）
exit 0
```
- ✅ Hook 成功执行
- ✅ stdout 显示在 transcript view
- ✅ Claude 继续正常流程

#### Exit Code 1（非阻塞错误）
```bash
#!/bin/bash
echo "Warning: Code style issue" >&2 # 用户可见
exit 1
```
- ⚠️ Hook 失败但不阻塞
- ⚠️ stderr 显示给用户
- ❌ Claude 不会看到错误（理论上）
- 🐛 **已知 Bug**: 实际上会阻塞 Claude（Issue #4809）

#### Exit Code 2（阻塞错误，反馈给 Claude）
```bash
#!/bin/bash
echo "Error: PSScriptAnalyzer found issues that must be fixed" >&2
echo "File: $file" >&2
echo "Details: Use approved verbs only" >&2
exit 2
```
- 🛑 Hook 阻塞 Claude 执行
- ✅ stderr 的内容**发送给 Claude 作为输入**
- ✅ Claude 可以根据错误信息调整行为
- ⚠️ 注意：对于 PostToolUse，工具已执行完毕，无法撤销

### 调试方法

#### 方法 1：使用 `claude --debug`

```bash
claude --debug
```

**输出示例**：
```
[DEBUG] Executing hooks for PostToolUse:Write
[DEBUG] Hook command: /path/to/hook.ps1
[DEBUG] Hook stdout: Processing file.ps1
[DEBUG] Hook completed with status 0
```

#### 方法 2：日志文件记录

```powershell
# PowerShell hook 脚本开头添加日志
$LogFile = "$env:CLAUDE_PROJECT_DIR\.claude\logs\posttooluse.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 记录所有环境变量
@"
[$Timestamp] PostToolUse Hook Triggered
Tool Name: $env:CLAUDE_TOOL_NAME
Tool Output: $env:CLAUDE_TOOL_OUTPUT
File Paths: $env:CLAUDE_FILE_PATHS
Event Type: $env:CLAUDE_EVENT_TYPE
"@ | Out-File -FilePath $LogFile -Append

# 记录 stdin JSON
$InputJson = [Console]::In.ReadToEnd()
"Stdin JSON: $InputJson" | Out-File -FilePath $LogFile -Append
```

#### 方法 3：使用 `/hooks` 命令

在 Claude Code 中运行：
```
/hooks
```

**功能**：
- ✅ 验证 hook 配置是否正确
- ✅ 手动测试 hook 命令
- ✅ 检查 exit code 行为
- ✅ 查看 hook 输出

#### 方法 4：Transcript View（Ctrl-R）

```
按 Ctrl-R 打开 transcript view
```

**可查看**：
- ✅ Hook 的 stdout 输出
- ✅ Hook 执行状态
- ✅ 错误消息

#### 方法 5：使用 echo 调试（Bash）

```bash
#!/bin/bash

# 写入临时文件方便调试
DEBUG_LOG="/tmp/claude_hook_debug.log"

echo "=== PostToolUse Hook Debug ===" >> "$DEBUG_LOG"
echo "Time: $(date)" >> "$DEBUG_LOG"
echo "Tool Name: $CLAUDE_TOOL_NAME" >> "$DEBUG_LOG"
echo "File Paths: $CLAUDE_FILE_PATHS" >> "$DEBUG_LOG"
echo "Tool Output: $CLAUDE_TOOL_OUTPUT" >> "$DEBUG_LOG"
echo "Stdin JSON:" >> "$DEBUG_LOG"
cat >> "$DEBUG_LOG"  # 捕获 stdin

# 重要：必须从临时文件读取 stdin（已被消费）
stdin_json=$(cat "$DEBUG_LOG" | grep -A 100 "Stdin JSON:")
```

---

## 最佳实践与示例代码

### 实践 1：自动代码格式化

#### PowerShell + PSScriptAnalyzer

```powershell
# .claude/hooks/posttooluse-format.ps1
[CmdletBinding()]
param()

# 从 stdin 读取 JSON
$InputJson = [Console]::In.ReadToEnd()

if (-not $InputJson) {
    Write-Error "No input JSON received"
    exit 1
}

try {
    $Data = $InputJson | ConvertFrom-Json
    $FilePath = $Data.tool_input.file_path

    # 只处理 PowerShell 文件
    if ($FilePath -match '\.ps1$') {
        Write-Output "Running PSScriptAnalyzer on $FilePath..."

        # 运行分析并自动修复
        $Results = Invoke-ScriptAnalyzer -Path $FilePath -Fix

        # 如果有 Error 级别问题，阻塞 Claude
        $Errors = $Results | Where-Object Severity -eq 'Error'
        if ($Errors) {
            Write-Error "PSScriptAnalyzer found errors in $FilePath :"
            $Errors | ForEach-Object {
                Write-Error "  - Line $($_.Line): $($_.Message)"
            }
            exit 2  # 阻塞并反馈给 Claude
        }

        Write-Output "Code formatting completed successfully"
        exit 0
    }
} catch {
    Write-Error "Hook failed: $_"
    exit 1
}
```

**配置**：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -NoProfile -File \"$CLAUDE_PROJECT_DIR/.claude/hooks/posttooluse-format.ps1\""
          }
        ]
      }
    ]
  }
}
```

### 实践 2：多语言自动格式化

```bash
#!/bin/bash
# .claude/hooks/posttooluse-format.sh

set -e

# 读取 stdin JSON
input_json=$(cat)

# 提取文件路径
file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
    echo "No file path found" >&2
    exit 1
fi

echo "Formatting: $file_path"

# 根据文件类型格式化
case "$file_path" in
    *.ts|*.tsx|*.js|*.jsx)
        prettier --write "$file_path"
        ;;
    *.py)
        black "$file_path" && ruff check --fix "$file_path"
        ;;
    *.rs)
        rustfmt "$file_path"
        ;;
    *.go)
        gofmt -w "$file_path"
        ;;
    *.ps1)
        pwsh -NoProfile -Command "Invoke-ScriptAnalyzer -Path '$file_path' -Fix"
        ;;
    *)
        echo "No formatter configured for: $file_path"
        ;;
esac

exit 0
```

### 实践 3：日志记录所有工具执行

```powershell
# .claude/hooks/posttooluse-logger.ps1
[CmdletBinding()]
param()

$LogDir = "$env:CLAUDE_PROJECT_DIR\.claude\logs"
$LogFile = Join-Path $LogDir "tool-execution.jsonl"

# 确保日志目录存在
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# 读取 stdin JSON
$InputJson = [Console]::In.ReadToEnd()

if ($InputJson) {
    $Data = $InputJson | ConvertFrom-Json

    # 创建日志条目
    $LogEntry = @{
        timestamp = Get-Date -Format "o"
        tool_name = $Data.tool_name
        file_path = $Data.tool_input.file_path
        tool_output = $Data.tool_output
        session_id = $Data.session_id
    } | ConvertTo-Json -Compress

    # 追加到 JSONL 文件
    $LogEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8

    Write-Output "Logged tool execution: $($Data.tool_name)"
}

exit 0
```

### 实践 4：运行测试（条件触发）

```powershell
# .claude/hooks/posttooluse-test.ps1
[CmdletBinding()]
param()

$InputJson = [Console]::In.ReadToEnd()
$Data = $InputJson | ConvertFrom-Json

$FilePath = $Data.tool_input.file_path

# 仅当修改测试文件或源文件时运行测试
if ($FilePath -match '\.(ps1|Tests\.ps1)$') {
    Write-Output "Running tests..."

    # 查找相关测试文件
    $TestFile = $FilePath -replace '\.ps1$', '.Tests.ps1'

    if (Test-Path $TestFile) {
        $Results = Invoke-Pester -Path $TestFile -PassThru

        if ($Results.FailedCount -gt 0) {
            Write-Error "Tests failed: $($Results.FailedCount) test(s)"
            Write-Error "File: $TestFile"
            exit 2  # 阻塞并反馈给 Claude
        }

        Write-Output "All tests passed"
    } else {
        Write-Output "No test file found for $FilePath"
    }
}

exit 0
```

### 实践 5：Git 自动提交（慎用）

```bash
#!/bin/bash
# .claude/hooks/posttooluse-git-add.sh

input_json=$(cat)
file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // empty')

if [ -n "$file_path" ]; then
    # 仅添加到暂存区，不自动提交
    git add "$file_path"
    echo "Added to git staging: $file_path"
fi

exit 0
```

### 实践 6：敏感文件保护

```powershell
# .claude/hooks/posttooluse-protect-sensitive.ps1
[CmdletBinding()]
param()

$InputJson = [Console]::In.ReadToEnd()
$Data = $InputJson | ConvertFrom-Json

$FilePath = $Data.tool_input.file_path
$SensitivePatterns = @(
    '\.env$'
    'credentials\.json$'
    'secrets\.ps1$'
    'config\.local\.ps1$'
)

foreach ($Pattern in $SensitivePatterns) {
    if ($FilePath -match $Pattern) {
        Write-Error "WARNING: Modified sensitive file: $FilePath"
        Write-Error "Please ensure no secrets are committed to version control"
        # 不阻塞，仅警告
        exit 1
    }
}

exit 0
```

---

## 已知问题与局限性

### Issue #9567: 环境变量为空

**问题描述**：
所有 hook 环境变量（`$CLAUDE_TOOL_INPUT`, `$CLAUDE_FILE_PATHS` 等）在某些情况下为空或 "unknown"。

**影响范围**：
Pre/PostToolUse hooks

**临时解决方案**：
使用 stdin JSON 解析代替环境变量

**状态**：
未修复（截至 2025-01-06）

### Issue #4809: Exit Code 1 阻塞 Claude

**问题描述**：
PostToolUse hook 返回 exit code 1 时，尽管文档称其为"非阻塞错误"，但实际上会阻塞 Claude 的后续操作。

**预期行为**：
Exit code 1 应该显示错误但允许 Claude 继续

**实际行为**：
Claude 被阻塞，等待用户输入

**影响**：
- 无法实现"显示警告但继续执行"的逻辑
- 需要手动区分"必须阻塞"（exit 2）和"仅警告"（exit 1）场景

**临时解决方案**：
- 使用 exit 0 + stderr 输出警告（但用户可能错过）
- 或使用 exit 2 阻塞所有错误

**状态**：
已报告，未修复

### Issue #4084: UserPromptSubmit Hook 输出不可见

**问题描述**：
UserPromptSubmit 和 PreToolUse hooks 的 stdout 输出无法在 Claude Code 界面显示

**影响范围**：
仅 UserPromptSubmit 和 PreToolUse

**PostToolUse 不受影响**：
PostToolUse 的 stdout 可通过 Ctrl-R 查看

### Issue #3148: Matcher `*` 不触发

**问题描述**：
在某些版本中，使用 `matcher: "*"` 时 Pre/PostToolUse hooks 不会触发

**临时解决方案**：
明确列出需要匹配的工具名：`"Write|Edit|MultiEdit|Bash|Read"`

### Issue #3983: PostToolUse JSON 输出未处理

**问题描述**：
PostToolUse hook 返回的 JSON 输出（用于控制流程）未被 Claude Code 正确处理

**影响**：
无法使用 JSON 输出的高级功能（如 `suppressOutput`, `stopReason`）

**状态**：
部分修复，建议测试当前版本

---

## 参考资源

### 官方文档

1. **Claude Code Hooks 参考文档**
   https://docs.claude.com/en/docs/claude-code/hooks
   - 完整的 hooks 配置和 API 参考

2. **Claude Code Hooks 入门指南**
   https://docs.claude.com/en/docs/claude-code/hooks-guide
   - 快速上手教程和基础示例

3. **Claude Code 设置**
   https://docs.claude.com/en/docs/claude-code/settings
   - settings.json 配置详解

### GitHub 资源

4. **disler/claude-code-hooks-mastery**
   https://github.com/disler/claude-code-hooks-mastery
   - 最全面的 hooks 示例集合
   - 包含 PostToolUse JSONL 日志转换示例
   - Sub-Agent 和 Meta-Agent 概念演示

5. **johnlindquist/claude-hooks**
   https://github.com/johnlindquist/claude-hooks
   - TypeScript 实现的 hooks
   - 类型安全和 IntelliSense 支持

6. **dhofheinz/claude-code-quality-hook**
   https://github.com/dhofheinz/claude-code-quality-hook
   - 自动代码质量检查和修复
   - 三阶段流水线（传统工具 + AI）

7. **disler/claude-code-hooks-multi-agent-observability**
   https://github.com/disler/claude-code-hooks-multi-agent-observability
   - 实时监控 Claude Code agents
   - 事件跟踪和可观测性

8. **carlrannaberg/claudekit**
   https://github.com/carlrannaberg/claudekit
   - Hooks、命令和实用工具工具箱

9. **shuntaka9576/blocc**
   https://github.com/shuntaka9576/blocc
   - 执行多命令并在失败时返回 exit 2

### 社区资源

10. **ClaudeLog 文档**
    https://claudelog.com/mechanics/hooks/
    - 社区维护的 hooks 机制详解

11. **GitButler Hooks 文档**
    https://docs.gitbutler.com/features/ai-integration/claude-code-hooks
    - GitButler 集成的 hooks 使用指南

12. **Steve Kinney - Claude Code Hook Control Flow**
    https://stevekinney.com/courses/ai-development/claude-code-hook-control-flow
    - Hook 控制流程详解

13. **Medium - How I'm Using Claude Code Hooks**
    https://medium.com/@joe.njenga/use-claude-code-hooks-newest-feature-to-fully-automate-your-workflow-341b9400cfbe
    - 工作流自动化实战经验

14. **Suite Insider - Complete Guide: Creating Claude Code Hooks**
    https://suiteinsider.com/complete-guide-creating-claude-code-hooks/
    - 全面的 hooks 创建指南

### GitHub Issues（已知问题）

15. **Issue #9567: Hook environment variables are empty**
    https://github.com/anthropics/claude-code/issues/9567
    - 环境变量为空的 bug 报告

16. **Issue #4809: PostToolUse Hook Exit Code 1 Blocks Claude**
    https://github.com/anthropics/claude-code/issues/4809
    - Exit code 1 阻塞行为异常

17. **Issue #4084: Hook Output Visibility Blocked**
    https://github.com/anthropics/claude-code/issues/4084
    - UserPromptSubmit 输出不可见

18. **Issue #3148: PreToolUse/PostToolUse Not Triggered with `*`**
    https://github.com/anthropics/claude-code/issues/3148
    - Matcher `*` 不工作

19. **Issue #3983: PostToolUse hook JSON output not processed**
    https://github.com/anthropics/claude-code/issues/3983
    - JSON 输出未正确处理

### JSON Schema 参考

20. **claude-code-hooks-schemas.md**
    https://gist.github.com/FrancisBourre/50dca37124ecc43eaf08328cdcccdb34
    - 完整的 hooks JSON schema 定义

---

## 附录 A：PostToolUse Hook 完整模板

### PowerShell 模板

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PostToolUse hook template for Claude Code

.DESCRIPTION
    This hook runs after a tool execution completes successfully.
    It demonstrates stdin JSON parsing, environment variable access,
    and proper error handling with exit codes.

.NOTES
    Author: 壮爸
    Date: 2025-01-06
#>

[CmdletBinding()]
param()

# 配置
$LogFile = "$env:CLAUDE_PROJECT_DIR\.claude\logs\posttooluse.log"
$EnableDebug = $true

# 辅助函数：写日志
function Write-HookLog {
    param([string]$Message)
    if ($EnableDebug) {
        $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$Timestamp] $Message" | Out-File -FilePath $LogFile -Append -Encoding UTF8
    }
}

try {
    Write-HookLog "=== PostToolUse Hook Started ==="

    # 1. 读取环境变量（可能为空）
    $ToolName = $env:CLAUDE_TOOL_NAME
    $ToolOutput = $env:CLAUDE_TOOL_OUTPUT
    $FilePaths = $env:CLAUDE_FILE_PATHS

    Write-HookLog "Env - Tool: $ToolName, Output: $ToolOutput, Files: $FilePaths"

    # 2. 读取 stdin JSON（推荐方式）
    $InputJson = [Console]::In.ReadToEnd()

    if (-not $InputJson) {
        Write-HookLog "WARNING: No stdin JSON received"
        Write-Warning "Hook received no input data"
        exit 0
    }

    Write-HookLog "Received JSON: $InputJson"

    # 3. 解析 JSON
    $Data = $InputJson | ConvertFrom-Json

    # 4. 提取数据
    $ToolNameFromJson = $Data.tool_name
    $ToolInput = $Data.tool_input
    $FilePath = $ToolInput.file_path
    $ToolOutputFromJson = $Data.tool_output

    Write-HookLog "Parsed - Tool: $ToolNameFromJson, File: $FilePath"

    # 5. 业务逻辑示例：仅处理 PowerShell 文件
    if ($FilePath -match '\.ps1$') {
        Write-Output "Processing PowerShell file: $FilePath"

        # 示例：运行 PSScriptAnalyzer
        if (Get-Command Invoke-ScriptAnalyzer -ErrorAction SilentlyContinue) {
            $Results = Invoke-ScriptAnalyzer -Path $FilePath -Severity Error

            if ($Results) {
                # 发现错误，阻塞 Claude 并提供反馈
                Write-Error "PSScriptAnalyzer found errors in $FilePath :"
                foreach ($Result in $Results) {
                    Write-Error "  Line $($Result.Line): $($Result.Message)"
                }
                Write-HookLog "BLOCKING: Errors found"
                exit 2  # 阻塞并将 stderr 发送给 Claude
            }

            Write-Output "Code analysis passed"
        }
    }

    # 6. 成功完成
    Write-Output "Hook completed successfully"
    Write-HookLog "=== PostToolUse Hook Completed ==="
    exit 0

} catch {
    # 7. 错误处理
    $ErrorMessage = $_.Exception.Message
    Write-Error "Hook failed: $ErrorMessage"
    Write-HookLog "ERROR: $ErrorMessage"
    exit 1  # 非阻塞错误（注意：可能实际会阻塞 Claude，见 Issue #4809）
}
```

### Bash 模板

```bash
#!/bin/bash
# PostToolUse hook template for Claude Code
# Author: 壮爸
# Date: 2025-01-06

set -euo pipefail  # 严格模式

# 配置
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/posttooluse.log"
ENABLE_DEBUG=true

# 辅助函数：写日志
log_message() {
    if [ "$ENABLE_DEBUG" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    fi
}

# 主逻辑
main() {
    log_message "=== PostToolUse Hook Started ==="

    # 1. 读取环境变量
    log_message "Env - Tool: $CLAUDE_TOOL_NAME, Files: $CLAUDE_FILE_PATHS"

    # 2. 读取 stdin JSON
    input_json=$(cat)

    if [ -z "$input_json" ]; then
        log_message "WARNING: No stdin JSON received"
        echo "Hook received no input data" >&2
        exit 0
    fi

    log_message "Received JSON: $input_json"

    # 3. 解析 JSON（需要 jq）
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed" >&2
        log_message "ERROR: jq not found"
        exit 1
    fi

    tool_name=$(echo "$input_json" | jq -r '.tool_name // "unknown"')
    file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // empty')
    tool_output=$(echo "$input_json" | jq -r '.tool_output // ""')

    log_message "Parsed - Tool: $tool_name, File: $file_path"

    # 4. 业务逻辑示例：多语言格式化
    if [ -n "$file_path" ]; then
        echo "Processing file: $file_path"

        case "$file_path" in
            *.ts|*.tsx|*.js|*.jsx)
                if command -v prettier &> /dev/null; then
                    prettier --write "$file_path" || {
                        echo "Error: prettier failed on $file_path" >&2
                        log_message "ERROR: prettier failed"
                        exit 2  # 阻塞并反馈给 Claude
                    }
                    echo "Formatted with prettier"
                fi
                ;;
            *.py)
                if command -v black &> /dev/null; then
                    black "$file_path" || {
                        echo "Error: black failed on $file_path" >&2
                        exit 2
                    }
                    echo "Formatted with black"
                fi
                ;;
            *.ps1)
                echo "PowerShell file detected, skipping Bash formatting"
                ;;
            *)
                echo "No formatter configured for: $file_path"
                ;;
        esac
    fi

    # 5. 成功完成
    echo "Hook completed successfully"
    log_message "=== PostToolUse Hook Completed ==="
    exit 0
}

# 错误处理
trap 'log_message "ERROR: Hook failed at line $LINENO"' ERR

# 执行主逻辑
main
```

---

## 附录 B：调试检查清单

### 配置验证

- [ ] `.claude/settings.json` 中 hooks 配置正确
- [ ] Matcher 模式匹配目标工具（大小写敏感）
- [ ] Hook 脚本路径正确且存在
- [ ] Hook 脚本有执行权限（`chmod +x` for Bash）

### 环境验证

- [ ] PowerShell 7+ 已安装（对于 .ps1 脚本）
- [ ] Bash 已安装（对于 .sh 脚本）
- [ ] 必要工具已安装（jq, prettier, black 等）
- [ ] `$CLAUDE_PROJECT_DIR` 环境变量可用

### 脚本验证

- [ ] 脚本能独立运行（不依赖 Claude Code）
- [ ] stdin JSON 解析逻辑正确
- [ ] 错误处理完善（try-catch）
- [ ] Exit code 使用正确（0/1/2）

### 运行时调试

- [ ] 使用 `claude --debug` 查看详细日志
- [ ] 使用 `/hooks` 命令验证配置
- [ ] 按 Ctrl-R 查看 transcript view
- [ ] 检查日志文件（如果有）
- [ ] 手动测试 hook 脚本（模拟 stdin JSON）

### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| Hook 不执行 | Matcher 不匹配 | 检查工具名大小写、使用 `*` 测试 |
| 环境变量为空 | Known bug | 使用 stdin JSON 代替 |
| Exit code 1 阻塞 | Known bug | 改用 exit 0 或 exit 2 |
| 输出不可见 | 未按 Ctrl-R | 打开 transcript view |
| JSON 解析失败 | stdin 未正确读取 | 检查脚本 stdin 读取逻辑 |

---

## 附录 C：快速参考卡

### PostToolUse Hook 速查表

```
触发时机:     工具执行成功后
输入方式:     stdin JSON + 环境变量
输出方式:     stdout (用户可见) / stderr (可反馈 Claude)
Exit Codes:   0 (成功) / 1 (警告, buggy) / 2 (阻塞+反馈)
常用工具:     Write, Edit, MultiEdit, Bash, Read
文件路径:     $CLAUDE_FILE_PATHS 或 stdin JSON
工具输出:     $CLAUDE_TOOL_OUTPUT 或 stdin JSON
调试方法:     claude --debug / Ctrl-R / 日志文件
```

### 环境变量快速查询

```bash
# 工具相关
$CLAUDE_TOOL_NAME        # "Write", "Edit", "Bash" 等
$CLAUDE_TOOL_OUTPUT      # 工具的输出结果（PostToolUse 专用）
$CLAUDE_TOOL_INPUT       # 工具输入的 JSON 字符串
$CLAUDE_FILE_PATHS       # 空格分隔的文件路径

# 事件相关
$CLAUDE_EVENT_TYPE       # "PostToolUse"
$CLAUDE_PROJECT_DIR      # 项目根目录
$CLAUDE_CODE_REMOTE      # "true" 或空（是否为远程）
```

### stdin JSON 结构快速查询

```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write|Edit|Bash|Read|...",
  "tool_input": {
    "file_path": "string",      // 文件相关工具
    "command": "string",         // Bash 工具
    "content": "string",         // Write 工具
    "old_string": "string",      // Edit 工具
    "new_string": "string"       // Edit 工具
  },
  "tool_output": "string"        // 工具执行结果
}
```

---

**报告结束**

如有更新或补充，请访问：
https://docs.claude.com/en/docs/claude-code/hooks
