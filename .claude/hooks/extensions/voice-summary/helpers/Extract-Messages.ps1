# ==============================================================================
# Script: Extract-Messages.ps1
# Purpose: 消息提取模块 - 从 transcript 提取用户和 Claude 的消息
# Author: 壮爸
# Refactored: 2025-01-06
# ==============================================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [string]$TranscriptPath
)

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 模块加载 ==============
# 每个脚本独立加载模块，确保作用域可见性
Import-Module (Join-Path $PSScriptRoot '..\..\..\..\modules\Logger.psm1') -Force -Scope Global
Import-Module (Join-Path $PSScriptRoot '..\..\..\..\modules\ErrorMonitor.psm1') -Force -Scope Global

# ============== 主逻辑 ==============
try {
    Write-VoiceInfo "=== Extract Messages Started ==="
    Write-VoiceDebug "Transcript path: $TranscriptPath"

    # 记录调用
    if (Get-Command Record-Call -ErrorAction SilentlyContinue) {
        Record-Call -Component "Extract"
    }

    if (!(Test-Path $TranscriptPath)) {
        Write-VoiceError "Transcript file not found"
        if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
            Record-Error -Component "Extract" -ErrorType "文件不存在" `
                -ErrorMessage "Transcript file not found: $TranscriptPath" -ScriptName "Extract-Messages.ps1"
        }
        return @{ UserMessage = ""; ClaudeReply = ""; Success = $false; Error = "File not found" }
    }

    # Wait for transcript to be fully written with retry logic
    $maxRetries = 3
    $lastLineCount = 0

    for ($i = 0; $i -lt $maxRetries; $i++) {
        Start-Sleep -Milliseconds 800
        $lines = Get-Content $TranscriptPath -Encoding UTF8 -ErrorAction SilentlyContinue
        $currentLineCount = $lines.Count

        Write-VoiceDebug "Retry $($i + 1): Line count = $currentLineCount"

        # If line count hasn't changed, transcript is stable
        if ($currentLineCount -eq $lastLineCount -and $i -gt 0) {
            Write-VoiceDebug "Transcript stable, proceeding"
            break
        }

        $lastLineCount = $currentLineCount
    }

    Write-VoiceDebug "Total lines: $($lines.Count)"

    $lastUser = ""
    $lastClaude = ""
    $claudeIdx = -1

    # Strategy: First find the last assistant message (Claude's reply)
    # Then find the last user message before it
    # This works better when scanning from bottom to top

    # Parse transcript from bottom to top
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }

        try {
            $entry = $lines[$i] | ConvertFrom-Json

            # First priority: Find Claude's last text response (not tool_use)
            if ([string]::IsNullOrEmpty($lastClaude)) {
                $isAssistantMessage = $false
                $content = $null

                # New format: type="assistant"
                if ($entry.type -eq "assistant" -and $entry.message -and $entry.message.role -eq "assistant") {
                    $isAssistantMessage = $true
                    $content = $entry.message.content
                }
                # Old format: type="output"/"message", role="assistant"
                elseif (($entry.type -eq "output" -or $entry.type -eq "message") -and $entry.role -eq "assistant") {
                    $isAssistantMessage = $true
                    $content = $entry.content
                }

                if ($isAssistantMessage -and $content) {
                    # Handle array content - look for text type, skip tool_use
                    if ($content -is [Array]) {
                        foreach ($item in $content) {
                            if ($item.type -eq "text" -and $item.text) {
                                $lastClaude = $item.text
                                $claudeIdx = $i
                                Write-VoiceDebug "Found Claude reply at line $i"
                                break
                            }
                        }
                    }
                    # Handle string content
                    elseif ($content -is [String]) {
                        $lastClaude = $content
                        $claudeIdx = $i
                        Write-VoiceDebug "Found Claude reply at line $i (string)"
                    }
                }
            }

            # Second priority: Find user message BEFORE Claude's reply
            if (($claudeIdx -ge 0) -and ($i -lt $claudeIdx) -and [string]::IsNullOrEmpty($lastUser)) {
                $isUserMessage = $false
                $content = $null

                # New format: type="user", message.role="user"
                if ($entry.type -eq "user" -and $entry.message -and $entry.message.role -eq "user") {
                    $isUserMessage = $true
                    $content = $entry.message.content
                }
                # Old format: type="input"/"message", role="user"
                elseif (($entry.type -eq "input" -or $entry.type -eq "message") -and $entry.role -eq "user") {
                    $isUserMessage = $true
                    $content = $entry.content
                }

                if ($isUserMessage -and $content) {
                    # Handle array content
                    if ($content -is [Array]) {
                        foreach ($item in $content) {
                            if ($item.type -eq "text" -and $item.text) {
                                $lastUser = $item.text
                                Write-VoiceDebug "Found user message at line $i"
                                break
                            }
                        }
                    }
                    # Handle string content
                    elseif ($content -is [String]) {
                        $lastUser = $content
                        Write-VoiceDebug "Found user message at line $i (string)"
                    }
                }
            }

            # Stop when both found
            if (![string]::IsNullOrEmpty($lastUser) -and ![string]::IsNullOrEmpty($lastClaude)) {
                Write-VoiceDebug "Both messages found, stopping search"
                break
            }
        }
        catch {
            Write-VoiceWarning "Error parsing line ${i}: $($_.Exception.Message)"
            continue
        }
    }

    Write-VoiceDebug "User message length: $($lastUser.Length)"
    Write-VoiceDebug "Claude reply length: $($lastClaude.Length)"

    $result = @{
        UserMessage = $lastUser
        ClaudeReply = $lastClaude
        Success = (![string]::IsNullOrEmpty($lastUser))
        Error = if (![string]::IsNullOrEmpty($lastUser)) { $null } else { "No messages found" }
    }

    Write-VoiceInfo "=== Extract Messages Completed ==="
    return $result

}
catch {
    Write-VoiceError "FATAL ERROR: $($_.Exception.Message)"
    if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
        Record-Error -Component "Extract" -ErrorType $_.Exception.GetType().Name `
            -ErrorMessage $_.Exception.Message -ScriptName "Extract-Messages.ps1"
    }
    return @{ UserMessage = ""; ClaudeReply = ""; Success = $false; Error = $_.Exception.Message }
}
