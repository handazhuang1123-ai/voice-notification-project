# ==============================================================================
# Script: Generate-VoiceSummary-v2.ps1
# Purpose: AI 语音总结生成模块 - 使用 Ollama 生成总结
# Author: 壮爸
# Refactored: 2025-01-06
# ==============================================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [string]$UserMessage,

    [Parameter(Mandatory = $false)]
    [string]$ClaudeReply = "",

    [Parameter(Mandatory = $false)]
    [int]$TimeoutSeconds = 10
)

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 导入模块 ==============
Import-Module (Join-Path $PSScriptRoot '..\modules\Logger.psm1') -Force

function Remove-TechnicalNoise {
    param([string]$Text)

    Write-VoiceDebug "Starting intelligent noise filtering..."

    # 1. Remove tool_use blocks
    $filtered = $Text -replace '(?s)<tool_use>.*?</tool_use>', '[FILTERED]'

    # 2. Remove code blocks
    $filtered = $filtered -replace '(?s)```[\s\S]*?```', '[CODE]'

    # 3. Remove file paths (Windows and Unix)
    $filtered = $filtered -replace '[A-Z]:\\[^\s]+', '[PATH]'
    $filtered = $filtered -replace '/[\w/\-\.]+\.(ps1|py|js|ts|md|txt|json)', '[FILE]'

    # 4. Remove log timestamps
    $filtered = $filtered -replace '\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', ''

    # 5. Remove extra blank lines
    $filtered = $filtered -replace '(\r?\n){3,}', "`n`n"
    $filtered = $filtered.Trim()

    $originalLength = $Text.Length
    $filteredLength = $filtered.Length
    $reduction = [math]::Round(($originalLength - $filteredLength) / $originalLength * 100, 1)

    Write-VoiceDebug "Filtering complete: $originalLength -> $filteredLength chars (reduced $reduction%)"

    return $filtered
}

function Get-EnhancedFallback {
    param($UserMsg, $ClaudeMsg)

    Write-VoiceDebug "Using enhanced fallback template"

    $userLower = $UserMsg.ToLower()
    $claudeLower = $ClaudeMsg.ToLower()

    if ($userLower -match "fix|bug|debug|solve|repair") {
        if ($claudeLower -match "auth|login|credential") { return "Authentication fixed" }
        if ($claudeLower -match "encod|utf|charset") { return "Encoding fixed" }
        if ($claudeLower -match "error|exception") { return "Error fixed" }
        return "Issue fixed"
    }
    elseif ($userLower -match "create|generate|make|write") {
        if ($claudeLower -match "document|word|docx") { return "Document created" }
        if ($claudeLower -match "report|summary") { return "Report generated" }
        if ($claudeLower -match "script|code") { return "Script created" }
        return "Content created"
    }
    elseif ($userLower -match "optim|improve|refactor|enhance") {
        if ($claudeLower -match "performance|speed|fast") { return "Performance optimized" }
        if ($claudeLower -match "code|script") { return "Code optimized" }
        return "Optimization completed"
    }
    elseif ($userLower -match "analy|check|review|explain|understand") {
        return "Analysis completed"
    }
    elseif ($userLower -match "test") {
        return "Testing completed"
    }
    elseif ($userLower -match "install|setup|config") {
        return "Configuration done"
    }
    else {
        return "Task completed"
    }
}

function Invoke-OllamaAPI {
    param($UserMsg, $ClaudeMsg)

    Write-VoiceDebug "=== Ollama API call started ==="

    # 1. Smart filtering of technical noise
    $claudeFiltered = Remove-TechnicalNoise -Text $ClaudeMsg

    # 2. Smart truncation (keep more content)
    $userTruncated = if ($UserMsg.Length -gt 800) {
        $UserMsg.Substring(0, 400) + " ... " + $UserMsg.Substring($UserMsg.Length - 400, 400)
    } else {
        $UserMsg
    }

    $claudeTruncated = if ($claudeFiltered.Length -gt 1500) {
        # Prioritize conclusion part
        $claudeFiltered.Substring(0, 500) + " ... " + $claudeFiltered.Substring($claudeFiltered.Length - 1000, 1000)
    } else {
        $claudeFiltered
    }

    Write-VoiceDebug "Input processed: User=$($userTruncated.Length) Claude=$($claudeTruncated.Length)"

    # 3. Use simplified Jarvis prompt (verified from 2025-01-07 research report, line 440-458)
    $promptLines = @(
        "你是专业AI助手,请用50-80字总结助手刚完成的工作。",
        "",
        "对话内容:",
        "用户: $userTruncated",
        "助手: $claudeTruncated",
        "",
        "要求:",
        "1. 开头用""先生,""",
        "2. 只描述""已完成""的动作,忽略""建议""、""询问""",
        "3. 提取最重要的1个数字或结果",
        "4. 使用完成时态 (已创建、已修复、已优化)",
        "5. 忽略代码块、工具调用、错误信息",
        "",
        "直接输出总结:"
    )
    $prompt = $promptLines -join "`n"

    # 4. Select best model
    $availableModels = @("qwen2.5:7b-instruct", "qwen2.5:7b", "qwen2.5:1.5b", "deepseek-r1:14b")
    $selectedModel = "qwen2.5:7b-instruct"

    try {
        $modelsResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2
        $installedModels = $modelsResponse.models | ForEach-Object { $_.name }

        foreach ($model in $availableModels) {
            if ($installedModels -contains $model) {
                $selectedModel = $model
                Write-VoiceDebug "Selected model: $selectedModel"
                break
            }
        }
    } catch {
        Write-VoiceDebug "Cannot detect models, using default: $selectedModel"
    }

    # 5. Optimized API parameters (based on 2025-01-07 research recommendations)
    $body = @{
        model = $selectedModel
        prompt = $prompt
        stream = $false
        options = @{
            temperature = 0.4          # Reduced from 0.5 to 0.4 for more deterministic output
            top_p = 0.85              # Added: Focus on high-probability tokens
            top_k = 30                # Added: Limit candidate tokens
            num_predict = 120         # Increased from 80 to 120 for 50-80 char output
            num_ctx = 8192
            repeat_penalty = 1.15     # Increased from 1.1 to 1.15 to avoid repetition
        }
    } | ConvertTo-Json -Depth 10

    # 6. Send request (correct UTF-8 handling)
    try {
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

        Write-VoiceDebug "Sending request to Ollama..."
        $webResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/generate" `
            -Method POST `
            -Body $bodyBytes `
            -ContentType "application/json; charset=utf-8" `
            -TimeoutSec $TimeoutSeconds `
            -UseBasicParsing

        # 7. Parse response
        $responseText = $webResponse.Content
        $response = $responseText | ConvertFrom-Json
        $summary = $response.response.Trim()

        Write-VoiceDebug "Raw response length: $($summary.Length)"

        # 8. Clean output
        # Remove thinking tags (deepseek-r1)
        $summary = $summary -replace '(?s)<think>.*?</think>', ''
        $summary = $summary -replace '(?s)<think>.*$', ''
        $summary = $summary.Trim()

        # Remove common English prefixes
        $summary = $summary -replace '^(I have |I completed |Claude has |Summary: )', ''
        $summary = $summary.Trim()

        # Remove quotes
        $summary = $summary -replace '^[\"''""]+', ''
        $summary = $summary -replace '[\"''""]+$', ''
        $summary = $summary.Trim()

        # 9. Length limit (updated to 80 chars for more expressive summaries)
        if ($summary.Length -gt 80) {
            $summary = $summary.Substring(0, 80)
            Write-VoiceDebug "Summary truncated to 80 chars"
        }

        Write-VoiceDebug "Final summary: $summary (Length: $($summary.Length))"

        # Validate output
        if ([string]::IsNullOrWhiteSpace($summary) -or $summary.Length -lt 3) {
            Write-VoiceDebug "Summary invalid (too short or empty)"
            return $null
        }

        return $summary

    } catch {
        Write-VoiceDebug "ERROR: $($_.Exception.Message)"
        return $null
    }
}

# ===== Main Flow =====
try {
    Write-VoiceInfo "=== Starting voice summary generation ==="
    Write-VoiceDebug "User message length: $($UserMessage.Length)"
    Write-VoiceDebug "Claude reply length: $($ClaudeReply.Length)"

    # Try Ollama
    $aiSummary = Invoke-OllamaAPI -UserMsg $UserMessage -ClaudeMsg $ClaudeReply

    if (![string]::IsNullOrWhiteSpace($aiSummary)) {
        Write-VoiceInfo "=== AI summary success ==="
        return $aiSummary
    } else {
        # Fallback
        $fallbackSummary = Get-EnhancedFallback -UserMsg $UserMessage -ClaudeMsg $ClaudeReply
        Write-VoiceWarning "=== Using fallback: $fallbackSummary ==="
        return $fallbackSummary
    }

} catch {
    Write-VoiceError "FATAL ERROR: $($_.Exception.Message)"
    return "Task completed"
}
