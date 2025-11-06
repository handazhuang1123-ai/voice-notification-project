# Test Logger Module
#Requires -Version 5.1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Importing Logger module..." -ForegroundColor Cyan
Import-Module (Join-Path $PSScriptRoot '.claude\modules\Logger.psm1') -Force
Write-Host "Module imported successfully`n" -ForegroundColor Green

Write-Host "Testing log levels:" -ForegroundColor Cyan
Write-VoiceDebug "DEBUG: Variable test"
Write-VoiceInfo "INFO: Task started"
Write-VoiceWarning "WARNING: API timeout"
Write-VoiceError "ERROR: Operation failed"

Write-Host "`nTesting Chinese encoding:" -ForegroundColor Cyan
Write-VoiceInfo "Chinese test"
Write-VoiceInfo "Hello World 123"

$logPath = Join-Path $PSScriptRoot 'logs\voice-unified.log'
if (Test-Path $logPath) {
    Write-Host "`nLog file created: $logPath" -ForegroundColor Green
    $logSize = (Get-Item $logPath).Length
    Write-Host "File size: $logSize bytes" -ForegroundColor Cyan
    Write-Host "`nLast 10 lines:" -ForegroundColor Cyan
    Get-Content $logPath -Encoding UTF8 -Tail 10 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
    Write-Host "`nTest completed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Log file not created" -ForegroundColor Red
    exit 1
}
