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

# ============== 统一模块加载（方案B优化） ==============
# 主脚本负责加载所有模块，子脚本通过检查全局变量避免重复加载
if (-not $global:VoiceModulesLoaded) {
    Write-Verbose "[主脚本] 开始加载模块..." -Verbose

    # 加载Logger模块
    Import-Module (Join-Path $PSScriptRoot '..\modules\Logger.psm1') -Force

    # 加载音频播放模块
    Import-Module (Join-Path $PSScriptRoot '..\modules\Invoke-PlayAudio.psm1') -Force

    # 加载错误监控模块
    Import-Module (Join-Path $PSScriptRoot '..\modules\ErrorMonitor.psm1') -Force

    # 设置全局标记
    $global:VoiceModulesLoaded = $true
    $global:VoiceModulesLoadTime = Get-Date

    Write-Verbose "[主脚本] 模块加载完成" -Verbose
}
else {
    Write-Verbose "[主脚本] 检测到模块已加载，跳过" -Verbose
}

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

    if (!(Test-Path $configPath)) {
        Write-VoiceWarning "Config file not found, using default emotion"
        return "assistant"
    }

    try {
        $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json

        # 检查是否启用 SSML
        if (-not $config.UseSSML) {
            return ""
        }

        # 检查是否启用自动检测
        if (-not $config.EmotionSettings.UseAutoDetection) {
            return $config.EmotionSettings.DefaultEmotion
        }

        # 自动检测关键词
        $combinedText = "$UserMessage $ClaudeReply"
        $mapping = $config.EmotionSettings.AutoMapping

        # 成功/完成
        if ($combinedText -match '(成功|完成|创建了|生成了|优化|提升|success|complete|created|generated|improved)') {
            return $mapping.Success
        }

        # 错误/失败
        if ($combinedText -match '(错误|失败|问题|bug|异常|error|fail|issue|problem|exception)') {
            return $mapping.Error
        }

        # 重要/警告
        if ($combinedText -match '(重要|注意|警告|关键|严重|important|warning|critical|serious)') {
            return $mapping.Warning
        }

        # 询问/建议
        if ($combinedText -match '(建议|推荐|可以|是否|需要|suggest|recommend|could|should|would you)') {
            return $mapping.Question
        }

        # 默认情感
        return $config.EmotionSettings.DefaultEmotion

    } catch {
        Write-VoiceError "Failed to load emotion config: $($_.Exception.Message)"
        return "assistant"
    }
}

# ============== 主逻辑 ==============
try {
    Write-VoiceInfo "=== Voice Notification Started ==="

    # 记录调用
    if (Get-Command Record-Call -ErrorAction SilentlyContinue) {
        Record-Call -Component "Other"
    }

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
                            if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
                                Record-Error -Component "AI" -ErrorType $_.Exception.GetType().Name `
                                    -ErrorMessage $_.Exception.Message -ScriptName "voice-notification.ps1"
                            }
                        }
                    } else {
                        Write-VoiceError "Generate-VoiceSummary.ps1 not found"
                    }
                } else {
                    Write-VoiceWarning "Message extraction failed: $($messages.Error)"
                    if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
                        Record-Error -Component "Extract" -ErrorType "Message extraction failed" `
                            -ErrorMessage $messages.Error -ScriptName "voice-notification.ps1"
                    }
                }
            } catch {
                Write-VoiceError "Extract-Messages failed: $($_.Exception.Message)"
                if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
                    Record-Error -Component "Extract" -ErrorType $_.Exception.GetType().Name `
                        -ErrorMessage $_.Exception.Message -ScriptName "voice-notification.ps1"
                }
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
                if (Get-Command Record-Error -ErrorAction SilentlyContinue) {
                    Record-Error -Component "TTS" -ErrorType "edge-tts playback failed" `
                        -ErrorMessage $voiceResult.Error -ScriptName "voice-notification.ps1"
                }
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
