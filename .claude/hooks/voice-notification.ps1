# Voice Notification Hook - Modular Architecture with AI
# Main orchestrator script

param()

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

function Write-DebugLog {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $debugLog = Join-Path $PSScriptRoot "voice-debug.log"
    $logEntry = "$timestamp | $message`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($debugLog, $logEntry, $utf8NoBom)
}

try {
    Write-DebugLog "=== Voice Notification Started ==="

    # Read stdin
    $inputLines = @()
    while ($null -ne ($line = [Console]::ReadLine())) {
        $inputLines += $line
    }
    $inputData = $inputLines -join "`n"

    if ([string]::IsNullOrWhiteSpace($inputData)) {
        Write-DebugLog "Empty input"
        exit 0
    }

    $hookInput = $inputData | ConvertFrom-Json
    $transcriptPath = $hookInput.transcript_path

    Write-DebugLog "Transcript path: $transcriptPath"

    # Default summary
    $summary = "Task completed"

    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        Write-DebugLog "Transcript file exists, extracting messages"

        # Module 1: Extract Messages
        $extractScript = Join-Path $PSScriptRoot "Extract-Messages.ps1"
        if (Test-Path $extractScript) {
            try {
                $messages = & $extractScript -TranscriptPath $transcriptPath
                Write-DebugLog "Messages extracted - Success: $($messages.Success)"

                if ($messages.Success) {
                    $userMsg = $messages.UserMessage
                    $claudeMsg = $messages.ClaudeReply

                    Write-DebugLog "User message: $($userMsg.Substring(0, [Math]::Min(100, $userMsg.Length)))"
                    Write-DebugLog "Claude reply: $($claudeMsg.Substring(0, [Math]::Min(100, $claudeMsg.Length)))"

                    # Module 2: Generate AI Summary
                    $summaryScript = Join-Path $PSScriptRoot "Generate-VoiceSummary-v2.ps1"
                    if (Test-Path $summaryScript) {
                        try {
                            $aiSummary = & $summaryScript -UserMessage $userMsg -ClaudeReply $claudeMsg -TimeoutSeconds 10

                            if (![string]::IsNullOrWhiteSpace($aiSummary)) {
                                $summary = $aiSummary
                                Write-DebugLog "AI summary generated successfully"
                            } else {
                                Write-DebugLog "AI summary empty, using default"
                            }
                        } catch {
                            Write-DebugLog "ERROR calling Generate-VoiceSummary: $($_.Exception.Message)"
                        }
                    } else {
                        Write-DebugLog "ERROR: Generate-VoiceSummary.ps1 not found"
                    }
                } else {
                    Write-DebugLog "Message extraction failed, using default summary"
                }
            } catch {
                Write-DebugLog "ERROR calling Extract-Messages: $($_.Exception.Message)"
            }
        } else {
            Write-DebugLog "ERROR: Extract-Messages.ps1 not found"
        }
    } else {
        Write-DebugLog "Transcript file does not exist or path is empty"
    }

    # Ensure summary is within character limits (60 for Chinese, 50 for English)
    $hasChinese = $summary -match '[\u4e00-\u9fa5]'
    $maxLength = if ($hasChinese) { 60 } else { 50 }
    if ($summary.Length -gt $maxLength) {
        $summary = $summary.Substring(0, $maxLength)
        Write-DebugLog "Summary truncated to $maxLength chars"
    }

    Write-DebugLog "FINAL SUMMARY: $summary"

    # Module 3: Voice Playback with edge-tts (fallback to SAPI)
    $edgeTtsScript = Join-Path $PSScriptRoot "Play-EdgeTTS.ps1"
    $voiceResult = $null

    if (Test-Path $edgeTtsScript) {
        try {
            Write-DebugLog "Attempting edge-tts playback..."
            $voiceResult = & $edgeTtsScript -Text $summary -TimeoutSeconds 10

            if ($voiceResult.Success) {
                Write-DebugLog "edge-tts playback successful"
            } else {
                Write-DebugLog "edge-tts failed: $($voiceResult.Error), falling back to SAPI"
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
                Wait-Job -Job $job -Timeout 8 | Out-Null
                $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
                Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                Write-DebugLog "SAPI fallback result: $result"
            }
        } catch {
            Write-DebugLog "ERROR calling Play-EdgeTTS: $($_.Exception.Message)"
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
            Wait-Job -Job $job -Timeout 8 | Out-Null
            $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            Write-DebugLog "SAPI fallback result: $result"
        }
    } else {
        Write-DebugLog "edge-tts module not found, using SAPI"
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
        Wait-Job -Job $job -Timeout 8 | Out-Null
        $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        Write-DebugLog "SAPI result: $result"
    }

    # Log to voice notifications file
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $PSScriptRoot "voice-notifications.log"
    $logEntry = "$timestamp | $summary`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($logPath, $logEntry, $utf8NoBom)

    Write-DebugLog "=== Voice Notification Completed ==="
    exit 0

} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $errorLog = Join-Path $PSScriptRoot "voice-notification-errors.log"
    $errorMsg = "$timestamp | ERROR | $($_.Exception.Message) | $($_.ScriptStackTrace)`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($errorLog, $errorMsg, $utf8NoBom)
    Write-DebugLog "FATAL ERROR: $($_.Exception.Message)"
    exit 0
}
