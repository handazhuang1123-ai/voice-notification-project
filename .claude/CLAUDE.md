# Voice Notification Project - Claude 开发指令

## 项目简介

PowerShell 语音通知工具，使用 Ollama AI 生成个性化通知文本，通过 Windows TTS 播放语音。

**技术栈**: PowerShell 7.x + Ollama API + Windows TTS

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

### 自动检查规则（PSScriptAnalyzer）

**自动检测规则**：
1. **避免别名**：使用完整 Cmdlet 名（`Get-ChildItem` 而非 `gci`）
2. **避免 Write-Host**：用 `Write-Output/Verbose/Warning`
3. **使用 CmdletBinding**：函数包含 `[CmdletBinding()]`
4. **批准动词命名**：函数使用 PowerShell 批准的动词
5. **代码格式化**：缩进、空格、括号位置等

**自动执行机制**：
- ✅ **Git Pre-commit Hook 已配置**（`.git/hooks/pre-commit` 和 `.git/hooks/pre-commit.ps1`）
- 每次 `git commit` 时自动运行 PSScriptAnalyzer
- **Error 级别问题会阻止提交**
- **Warning 级别问题会显示警告但允许提交**

> **严格参考**: `PSScriptAnalyzerSettings.psd1` 定义了所有自动检查规则

---

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

## 提交规范

使用 Conventional Commits 格式（通过 GitHub MCP 提交时使用）：
- `feat`: 新功能
- `fix`: 修复Bug
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试

示例：`feat(ollama): 添加重试机制`

---

## Claude 特殊指令

1. **⚠️ 必须充分理解需求后再执行**
   - 在执行任何任务前，必须通过反复提问来澄清所有重要的细节
   - 直到完全了解需求并得到壮爸的明确确认后，才可以开始执行任务
   - 不要假设或猜测需求，不确定时务必提问

2. **始终用中文回复**

3. **遵循上述 PowerShell 编码规范**

4. **每个函数必须有完整 Comment-Based Help**

5. **永远不硬编码敏感信息**

6. **代码必须能通过 PSScriptAnalyzer 检查**

---

## 其他参考文档

- **`docs/PowerShell项目标准化最佳实践调研报告.md`** - PowerShell 详细最佳实践和深入说明

---

**维护者**: 壮爸 | **版本**: 1.3 | **更新**: 2025-01-19
