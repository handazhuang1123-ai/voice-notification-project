# Edge-TTS Voice Playback Module
# High-quality text-to-speech using Microsoft Edge TTS

param(
    [Parameter(Mandatory=$true)]
    [string]$Text,

    [Parameter(Mandatory=$false)]
    [string]$Voice = "zh-CN-XiaoxiaoNeural",

    [Parameter(Mandatory=$false)]
    [int]$TimeoutSeconds = 10
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-ModuleLog {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path (Split-Path $PSScriptRoot) "hooks\edge-tts.log"
    $logEntry = "$timestamp | $message`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($logPath, $logEntry, $utf8NoBom)
}

try {
    Write-ModuleLog "=== Edge-TTS Playback Started ==="
    Write-ModuleLog "Text: $Text"
    Write-ModuleLog "Voice: $Voice"

    # Generate temporary file path
    $tempPath = Join-Path $env:TEMP "voice-notification-$(Get-Random).mp3"
    Write-ModuleLog "Temp file: $tempPath"

    # Call edge-tts to generate audio
    Write-ModuleLog "Calling edge-tts..."

    # Write text to a temporary UTF-8 file to avoid encoding issues
    $textFilePath = Join-Path $env:TEMP "voice-notification-text-$(Get-Random).txt"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($textFilePath, $Text, $utf8NoBom)
    Write-ModuleLog "Text file created: $textFilePath"

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
        Write-ModuleLog "ERROR: edge-tts failed with exit code $($edgeTtsProcess.ExitCode)"
        return @{ Success = $false; Error = "edge-tts generation failed" }
    }

    # Wait for file to be fully written
    Start-Sleep -Milliseconds 200

    if (!(Test-Path $tempPath)) {
        Write-ModuleLog "ERROR: Audio file not generated"
        return @{ Success = $false; Error = "Audio file not found" }
    }

    $fileSize = (Get-Item $tempPath).Length
    Write-ModuleLog "Audio file generated: $fileSize bytes"

    # Play audio using Windows Media Player COM object
    Write-ModuleLog "Starting playback..."
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

    Write-ModuleLog "Playback result: $result"

    # Cleanup temp file
    Start-Sleep -Milliseconds 500
    Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    Write-ModuleLog "Temp file cleaned up"

    Write-ModuleLog "=== Edge-TTS Playback Completed ==="
    return @{ Success = $true; Result = $result }

} catch {
    Write-ModuleLog "FATAL ERROR: $($_.Exception.Message)"
    return @{ Success = $false; Error = $_.Exception.Message }
}
