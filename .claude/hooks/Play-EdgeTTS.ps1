# ==============================================================================
# Script: Play-EdgeTTS.ps1
# Purpose: Edge-TTS 语音播放模块 - 高质量中文语音合成
# Author: 壮爸
# Refactored: 2025-01-06
# ==============================================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [Parameter(Mandatory = $false)]
    [string]$Voice = "zh-CN-XiaoxiaoNeural",

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

# ============== 主逻辑 ==============
try {
    Write-VoiceInfo "=== Edge-TTS Playback Started ==="
    Write-VoiceDebug "Text: $Text"
    Write-VoiceDebug "Voice: $Voice"

    # Generate temporary file path
    $tempPath = Join-Path $env:TEMP "voice-notification-$(Get-Random).mp3"
    Write-VoiceDebug "Temp file: $tempPath"

    # Call edge-tts to generate audio
    Write-VoiceDebug "Calling edge-tts..."

    # Write text to a temporary UTF-8 file to avoid encoding issues
    $textFilePath = Join-Path $env:TEMP "voice-notification-text-$(Get-Random).txt"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($textFilePath, $Text, $utf8NoBom)
    Write-VoiceDebug "Text file created: $textFilePath"

    # Use file input instead of command-line argument for better encoding handling
    $argumentList = @(
        "--voice", $Voice,
        "--file", $textFilePath,
        "--write-media", $tempPath
    )

    $edgeTtsProcess = Start-Process -FilePath "edge-tts" `
        -ArgumentList $argumentList `
        -NoNewWindow -PassThru -Wait

    # Clean up text file
    Remove-Item $textFilePath -Force -ErrorAction SilentlyContinue

    if ($edgeTtsProcess.ExitCode -ne 0) {
        Write-VoiceError "edge-tts failed with exit code $($edgeTtsProcess.ExitCode)"
        return @{ Success = $false; Error = "edge-tts generation failed" }
    }

    # Wait for file to be fully written
    Start-Sleep -Milliseconds 200

    if (!(Test-Path $tempPath)) {
        Write-VoiceError "Audio file not generated"
        return @{ Success = $false; Error = "Audio file not found" }
    }

    $fileSize = (Get-Item $tempPath).Length
    Write-VoiceDebug "Audio file generated: $fileSize bytes"

    # Play audio using Windows Media Player COM object
    Write-VoiceDebug "Starting playback..."
    $jobScript = {
        param($audioPath)
        try {
            $player = New-Object -ComObject WMPlayer.OCX
            $player.settings.volume = 100
            $player.URL = $audioPath
            $player.controls.play()

            # Wait for playback to complete
            $maxWait = 15
            $waited = 0
            while ($player.playState -ne 1 -and $waited -lt $maxWait) {
                Start-Sleep -Milliseconds 500
                $waited += 0.5
            }

            $player.controls.stop()
            $player.close()
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($player) | Out-Null
            return "SUCCESS"
        } catch {
            return "ERROR: $($_.Exception.Message)"
        }
    }

    $job = Start-Job -ScriptBlock $jobScript -ArgumentList $tempPath
    Wait-Job -Job $job -Timeout $TimeoutSeconds | Out-Null
    $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

    Write-VoiceDebug "Playback result: $result"

    # Cleanup temp file
    Start-Sleep -Milliseconds 500
    Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    Write-VoiceDebug "Temp file cleaned up"

    Write-VoiceInfo "=== Edge-TTS Playback Completed ==="
    return @{ Success = $true; Result = $result }

} catch {
    Write-VoiceError "FATAL ERROR: $($_.Exception.Message)"
    return @{ Success = $false; Error = $_.Exception.Message }
}
