# ==============================================================================
# Script: voice-notification.ps1
# Purpose: 主编排脚本 - Voice Notification Hook
# Author: 壮爸
# Refactored: 2025-01-06
# ==============================================================================

#Requires -Version 5.1

param()

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 导入模块 ==============
Import-Module (Join-Path $PSScriptRoot '..\modules\Logger.psm1') -Force

# ============== 情感检测函数 ==============
function Get-EmotionStyle {
    <#
    .SYNOPSIS
        Detect appropriate emotion style based on message content
        根据消息内容检测合适的情感风格

    .PARAMETER UserMessage
        User's message
        用户消息

    .PARAMETER ClaudeReply
        Claude's reply
        Claude 回复

    .OUTPUTS
        String emotion style (assistant, cheerful, calm, serious, etc.)
        返回字符串情感风格
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$UserMessage = "",

        [Parameter(Mandatory = $false)]
        [string]$ClaudeReply = ""
    )

    # 加载配置
    $configPath = Join-Path $PSScriptRoot "voice-config.json"
    $defaultEmotion = "assistant"

    if (Test-Path $configPath) {
        try {
            $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if (-not $config.UseSSML) {
                return ""
            }
            $defaultEmotion = $config.Emotion
        } catch {
            Write-VoiceDebug "Config load failed, using default emotion"
        }
    }

    $combinedText = "$UserMessage $ClaudeReply"

    # 成功/完成 - cheerful
    if ($combinedText -match '(成功|完成|创建了|生成了|优化|提升|success|complete|created|generated|improved)') {
        return "cheerful"
    }

    # 错误/失败 - calm (冷静处理错误)
    if ($combinedText -match '(错误|失败|问题|bug|异常|error|fail|issue|problem|exception)') {
        return "calm"
    }

    # 重要/严肃 - serious
    if ($combinedText -match '(重要|注意|警告|关键|严重|important|warning|critical|serious)') {
        return "serious"
    }

    # 询问/建议 - gentle
    if ($combinedText -match '(建议|推荐|可以|是否|需要|suggest|recommend|could|should|would you)') {
        return "gentle"
    }

    # 默认 - assistant (专业助手)
    return $defaultEmotion
}

# ============== 主逻辑 ==============
try {
    Write-VoiceInfo "=== Voice Notification Started ==="

    # Read stdin
    $inputLines = @()
    while ($null -ne ($line = [Console]::ReadLine())) {
        $inputLines += $line
    }
    $inputData = $inputLines -join "`n"

    if ([string]::IsNullOrWhiteSpace($inputData)) {
        Write-VoiceDebug "Empty input"
        exit 0
    }

    $hookInput = $inputData | ConvertFrom-Json
    $transcriptPath = $hookInput.transcript_path

    Write-VoiceDebug "Transcript path: $transcriptPath"

    # Default summary
    $summary = "Task completed"

    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        Write-VoiceInfo "Transcript file exists, processing..."

        # Module 1: Extract Messages
        $extractScript = Join-Path $PSScriptRoot "Extract-Messages.ps1"
        if (Test-Path $extractScript) {
            try {
                $messages = & $extractScript -TranscriptPath $transcriptPath

                if ($messages.Success) {
                    Write-VoiceInfo "Messages extracted successfully"
                    $userMsg = $messages.UserMessage
                    $claudeMsg = $messages.ClaudeReply

                    Write-VoiceDebug "User message: $($userMsg.Substring(0, [Math]::Min(100, $userMsg.Length)))"
                    Write-VoiceDebug "Claude reply: $($claudeMsg.Substring(0, [Math]::Min(100, $claudeMsg.Length)))"

                    # Module 2: Generate AI Summary
                    $summaryScript = Join-Path $PSScriptRoot "Generate-VoiceSummary-v2.ps1"
                    if (Test-Path $summaryScript) {
                        try {
                            $aiSummary = & $summaryScript -UserMessage $userMsg -ClaudeReply $claudeMsg -TimeoutSeconds 10

                            if (![string]::IsNullOrWhiteSpace($aiSummary)) {
                                $summary = $aiSummary
                                Write-VoiceInfo "AI summary generated"
                            } else {
                                Write-VoiceWarning "AI summary empty, using default"
                            }
                        } catch {
                            Write-VoiceError "Generate-VoiceSummary failed: $($_.Exception.Message)"
                        }
                    } else {
                        Write-VoiceError "Generate-VoiceSummary.ps1 not found"
                    }
                } else {
                    Write-VoiceWarning "Message extraction failed: $($messages.Error)"
                }
            } catch {
                Write-VoiceError "Extract-Messages failed: $($_.Exception.Message)"
            }
        } else {
            Write-VoiceError "Extract-Messages.ps1 not found"
        }
    } else {
        Write-VoiceDebug "Transcript file not found, using default summary"
    }

    # Ensure summary is within character limits (updated to 80 for Chinese, 70 for English)
    $hasChinese = $summary -match '[\u4e00-\u9fa5]'
    $maxLength = if ($hasChinese) { 80 } else { 70 }
    if ($summary.Length -gt $maxLength) {
        $summary = $summary.Substring(0, $maxLength)
        Write-VoiceDebug "Summary truncated to $maxLength chars"
    }

    Write-VoiceInfo "FINAL SUMMARY: $summary"

    # Module 3: Detect emotion style
    $emotionStyle = ""
    if ($userMsg -and $claudeMsg) {
        $emotionStyle = Get-EmotionStyle -UserMessage $userMsg -ClaudeReply $claudeMsg
        Write-VoiceInfo "Detected emotion style: $emotionStyle"
    }

    # Module 4: Voice Playback with edge-tts (fallback to SAPI)
    $edgeTtsScript = Join-Path $PSScriptRoot "Play-EdgeTTS.ps1"
    $voiceResult = $null

    if (Test-Path $edgeTtsScript) {
        try {
            Write-VoiceDebug "Attempting edge-tts playback with emotion style..."
            $voiceResult = & $edgeTtsScript -Text $summary -EmotionStyle $emotionStyle -TimeoutSeconds 30

            if ($voiceResult.Success) {
                Write-VoiceInfo "edge-tts playback successful"
            } else {
                Write-VoiceWarning "edge-tts failed: $($voiceResult.Error), falling back to SAPI"
                # Fallback to SAPI
                $jobScript = {
                    param($text)
                    try {
                        $voice = New-Object -ComObject SAPI.SpVoice
                        $voice.Volume = 100
                        $voice.Rate = -1
                        $voice.Speak($text, 0)
                        return "SUCCESS"
                    } catch {
                        return "ERROR: $($_.Exception.Message)"
                    }
                }

                $job = Start-Job -ScriptBlock $jobScript -ArgumentList $summary
                Wait-Job -Job $job | Out-Null
                $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
                Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                Write-VoiceDebug "SAPI fallback result: $result"
            }
        } catch {
            Write-VoiceError "Play-EdgeTTS failed: $($_.Exception.Message)"
            # Fallback to SAPI
            $jobScript = {
                param($text)
                try {
                    $voice = New-Object -ComObject SAPI.SpVoice
                    $voice.Volume = 100
                    $voice.Rate = -1
                    $voice.Speak($text, 0)
                    return "SUCCESS"
                } catch {
                    return "ERROR: $($_.Exception.Message)"
                }
            }

            $job = Start-Job -ScriptBlock $jobScript -ArgumentList $summary
            Wait-Job -Job $job | Out-Null
            $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            Write-VoiceDebug "SAPI fallback result: $result"
        }
    } else {
        Write-VoiceWarning "edge-tts module not found, using SAPI"
        # Use SAPI directly
        $jobScript = {
            param($text)
            try {
                $voice = New-Object -ComObject SAPI.SpVoice
                $voice.Volume = 100
                $voice.Rate = -1
                $voice.Speak($text, 0)
                return "SUCCESS"
            } catch {
                return "ERROR: $($_.Exception.Message)"
            }
        }

        $job = Start-Job -ScriptBlock $jobScript -ArgumentList $summary
        Wait-Job -Job $job | Out-Null
        $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        Write-VoiceDebug "SAPI result: $result"
    }

    Write-VoiceInfo "=== Voice Notification Completed ==="
    exit 0

} catch {
    Write-VoiceError "FATAL ERROR: $($_.Exception.Message)"
    Write-VoiceError "Stack trace: $($_.ScriptStackTrace)"
    exit 0
}
