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

    # Module 3: Voice Playback with edge-tts (fallback to SAPI)
    $edgeTtsScript = Join-Path $PSScriptRoot "Play-EdgeTTS.ps1"
    $voiceResult = $null

    if (Test-Path $edgeTtsScript) {
        try {
            Write-VoiceDebug "Attempting edge-tts playback..."
            $voiceResult = & $edgeTtsScript -Text $summary

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
