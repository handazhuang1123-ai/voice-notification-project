# Test Voice Notification Hook
# Usage: powershell -ExecutionPolicy Bypass -File test-voice.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Voice Notification Hook Tester" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$hooksDir = $PSScriptRoot

# Test 1: Check files exist
Write-Host "[1/5] Checking files..." -ForegroundColor Yellow
$requiredFiles = @(
    "voice-notification.ps1",
    "voice-templates.json",
    "test-input.json",
    "test-transcript.jsonl"
)

$allExist = $true
foreach ($file in $requiredFiles) {
    $path = Join-Path $hooksDir $file
    if (Test-Path $path) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $file not found" -ForegroundColor Red
        $allExist = $false
    }
}

if (!$allExist) {
    Write-Host ""
    Write-Host "Some required files are missing. Exiting." -ForegroundColor Red
    exit 1
}

# Test 2: Check templates.json syntax
Write-Host ""
Write-Host "[2/5] Validating templates.json..." -ForegroundColor Yellow
try {
    $templatesPath = Join-Path $hooksDir "voice-templates.json"
    $templates = Get-Content $templatesPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "  [OK] JSON syntax valid" -ForegroundColor Green
    Write-Host "  [OK] Templates count: $($templates.templates.PSObject.Properties.Count)" -ForegroundColor Green
    Write-Host "  [OK] Keywords count: $($templates.keywords.PSObject.Properties.Count)" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Invalid JSON: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Test Windows TTS
Write-Host ""
Write-Host "[3/5] Testing Windows TTS..." -ForegroundColor Yellow
try {
    $voice = New-Object -ComObject SAPI.SpVoice
    $voice.Volume = 50
    $voice.Rate = 0
    Write-Host "  [OK] SAPI.SpVoice available" -ForegroundColor Green
    Write-Host "  [INFO] Playing test voice..." -ForegroundColor Cyan
    $voice.Speak("测试语音", 0) | Out-Null
    Write-Host "  [OK] Voice playback succeeded" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] TTS error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [INFO] Voice notification will not work" -ForegroundColor Yellow
}

# Test 4: Run voice notification with test data
Write-Host ""
Write-Host "[4/5] Running voice notification hook..." -ForegroundColor Yellow
try {
    $testInputPath = Join-Path $hooksDir "test-input.json"
    $scriptPath = Join-Path $hooksDir "voice-notification.ps1"

    Get-Content $testInputPath | & $scriptPath
    Write-Host "  [OK] Hook executed successfully" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Hook execution error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Check logs
Write-Host ""
Write-Host "[5/5] Checking logs..." -ForegroundColor Yellow

$debugLog = Join-Path $hooksDir "voice-debug.log"
if (Test-Path $debugLog) {
    Write-Host "  [OK] voice-debug.log exists" -ForegroundColor Green
    $lastLines = Get-Content $debugLog -Tail 5 -Encoding UTF8
    Write-Host "  [INFO] Last 5 lines:" -ForegroundColor Cyan
    foreach ($line in $lastLines) {
        Write-Host "    $line" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARN] voice-debug.log not found" -ForegroundColor Yellow
}

$voiceLog = Join-Path $hooksDir "voice-notifications.log"
if (Test-Path $voiceLog) {
    Write-Host "  [OK] voice-notifications.log exists" -ForegroundColor Green
    $lastEntry = Get-Content $voiceLog -Tail 1 -Encoding UTF8
    Write-Host "  [INFO] Last notification: $lastEntry" -ForegroundColor Cyan
} else {
    Write-Host "  [WARN] voice-notifications.log not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test completed successfully!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy .claude folder to your project root" -ForegroundColor White
Write-Host "2. Open project in Claude Code" -ForegroundColor White
Write-Host "3. Chat with Claude and wait for Stop event" -ForegroundColor White
Write-Host ""
