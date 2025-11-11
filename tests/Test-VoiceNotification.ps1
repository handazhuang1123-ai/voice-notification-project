# ==============================================================================
# Script: Test-VoiceNotification.ps1
# Purpose: 语音通知系统测试脚本
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

# ========== 测试配置 ==========
$script:TestResults = @()
$script:PassCount = 0
$script:FailCount = 0

# 颜色输出函数
function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [string]$Message = ""
    )

    if ($Success) {
        Write-Host "✅ PASS: $TestName" -ForegroundColor Green
        $script:PassCount++
    } else {
        Write-Host "❌ FAIL: $TestName" -ForegroundColor Red
        if ($Message) {
            Write-Host "   原因: $Message" -ForegroundColor Yellow
        }
        $script:FailCount++
    }

    $script:TestResults += @{
        TestName = $TestName
        Success = $Success
        Message = $Message
        Time = Get-Date
    }
}

Write-Host @"
╔══════════════════════════════════════════════╗
║     语音通知系统 - 测试套件 v1.0            ║
║     Voice Notification Test Suite           ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`n📋 开始测试..." -ForegroundColor Yellow

# ========== 1. 环境检查测试 ==========
Write-Host "`n[环境检查]" -ForegroundColor Cyan

# 测试1: PowerShell版本
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5 -and $psVersion.Minor -ge 1) {
    Write-TestResult -TestName "PowerShell版本检查" -Success $true
} else {
    Write-TestResult -TestName "PowerShell版本检查" -Success $false -Message "需要 PowerShell 5.1+，当前: $psVersion"
}

# 测试2: Edge-TTS检查
try {
    $edgeTtsPath = Join-Path $env:APPDATA "npm\edge-tts.cmd"
    if (Test-Path $edgeTtsPath) {
        Write-TestResult -TestName "Edge-TTS 安装检查" -Success $true
    } else {
        # 尝试从PATH查找
        $null = Get-Command edge-tts -ErrorAction Stop
        Write-TestResult -TestName "Edge-TTS 安装检查" -Success $true
    }
} catch {
    Write-TestResult -TestName "Edge-TTS 安装检查" -Success $false -Message "未找到 edge-tts，请运行: pip install edge-tts"
}

# 测试3: Ollama服务检查
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2
    Write-TestResult -TestName "Ollama 服务检查" -Success $true
} catch {
    Write-TestResult -TestName "Ollama 服务检查" -Success $false -Message "Ollama服务未运行或无法访问"
}

# ========== 2. 模块加载测试 ==========
Write-Host "`n[模块加载测试]" -ForegroundColor Cyan

# 测试4: Logger模块
try {
    Import-Module (Join-Path $PSScriptRoot '..\\.claude\modules\Logger.psm1') -Force -ErrorAction Stop
    Write-TestResult -TestName "Logger模块加载" -Success $true
} catch {
    Write-TestResult -TestName "Logger模块加载" -Success $false -Message $_.Exception.Message
}

# 测试5: 音频播放模块
try {
    Import-Module (Join-Path $PSScriptRoot '..\\.claude\modules\Invoke-PlayAudio.psm1') -Force -ErrorAction Stop
    Write-TestResult -TestName "音频播放模块加载" -Success $true
} catch {
    Write-TestResult -TestName "音频播放模块加载" -Success $false -Message $_.Exception.Message
}

# ========== 3. 功能组件测试 ==========
Write-Host "`n[功能组件测试]" -ForegroundColor Cyan

# 测试6: 消息提取功能
try {
    $extractScript = Join-Path $PSScriptRoot '..\\.claude\hooks\Extract-Messages.ps1'
    if (Test-Path $extractScript) {
        Write-TestResult -TestName "消息提取脚本存在" -Success $true
    } else {
        Write-TestResult -TestName "消息提取脚本存在" -Success $false -Message "找不到 Extract-Messages.ps1"
    }
} catch {
    Write-TestResult -TestName "消息提取脚本存在" -Success $false -Message $_.Exception.Message
}

# 测试7: AI总结生成功能
try {
    $summaryScript = Join-Path $PSScriptRoot '..\\.claude\hooks\Generate-VoiceSummary-v2.ps1'
    if (Test-Path $summaryScript) {
        Write-TestResult -TestName "AI总结脚本存在" -Success $true
    } else {
        Write-TestResult -TestName "AI总结脚本存在" -Success $false -Message "找不到 Generate-VoiceSummary-v2.ps1"
    }
} catch {
    Write-TestResult -TestName "AI总结脚本存在" -Success $false -Message $_.Exception.Message
}

# 测试8: 语音播放功能
try {
    $playScript = Join-Path $PSScriptRoot '..\\.claude\hooks\Play-EdgeTTS.ps1'
    if (Test-Path $playScript) {
        Write-TestResult -TestName "语音播放脚本存在" -Success $true
    } else {
        Write-TestResult -TestName "语音播放脚本存在" -Success $false -Message "找不到 Play-EdgeTTS.ps1"
    }
} catch {
    Write-TestResult -TestName "语音播放脚本存在" -Success $false -Message $_.Exception.Message
}

# ========== 4. 配置文件测试 ==========
Write-Host "`n[配置文件测试]" -ForegroundColor Cyan

# 测试9: 语音配置文件
try {
    $configPath = Join-Path $PSScriptRoot '..\\.claude\hooks\voice-config.json'
    if (Test-Path $configPath) {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($config.Voice -and $config.Rate -ne $null) {
            Write-TestResult -TestName "语音配置文件验证" -Success $true
        } else {
            Write-TestResult -TestName "语音配置文件验证" -Success $false -Message "配置文件格式不正确"
        }
    } else {
        Write-TestResult -TestName "语音配置文件验证" -Success $false -Message "找不到 voice-config.json"
    }
} catch {
    Write-TestResult -TestName "语音配置文件验证" -Success $false -Message $_.Exception.Message
}

# 测试10: Claude settings.json
try {
    $settingsPath = Join-Path $PSScriptRoot '..\\.claude\settings.json'
    if (Test-Path $settingsPath) {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($settings.hooks.Stop) {
            Write-TestResult -TestName "Claude Hook配置验证" -Success $true
        } else {
            Write-TestResult -TestName "Claude Hook配置验证" -Success $false -Message "未配置Stop hook"
        }
    } else {
        Write-TestResult -TestName "Claude Hook配置验证" -Success $false -Message "找不到 settings.json"
    }
} catch {
    Write-TestResult -TestName "Claude Hook配置验证" -Success $false -Message $_.Exception.Message
}

# ========== 5. 简单功能测试 ==========
Write-Host "`n[简单功能测试]" -ForegroundColor Cyan

# 测试11: 生成简单语音文件
try {
    Write-Host "   测试语音生成..." -ForegroundColor Gray
    $testText = "测试语音"
    $outputPath = Join-Path $env:TEMP "test_voice_$(Get-Date -Format 'yyyyMMddHHmmss').mp3"

    # 尝试生成语音文件
    $edgeTtsCmd = Join-Path $env:APPDATA "npm\edge-tts.cmd"
    if (Test-Path $edgeTtsCmd) {
        & $edgeTtsCmd --text $testText --voice "zh-CN-XiaoxiaoNeural" --write-media $outputPath 2>$null

        if (Test-Path $outputPath) {
            $fileSize = (Get-Item $outputPath).Length
            if ($fileSize -gt 1000) {  # 文件大于1KB
                Write-TestResult -TestName "语音文件生成测试" -Success $true
            } else {
                Write-TestResult -TestName "语音文件生成测试" -Success $false -Message "生成的文件太小: ${fileSize}字节"
            }
            Remove-Item $outputPath -Force -ErrorAction SilentlyContinue
        } else {
            Write-TestResult -TestName "语音文件生成测试" -Success $false -Message "未能生成语音文件"
        }
    } else {
        Write-TestResult -TestName "语音文件生成测试" -Success $false -Message "找不到 edge-tts"
    }
} catch {
    Write-TestResult -TestName "语音文件生成测试" -Success $false -Message $_.Exception.Message
}

# ========== 测试总结 ==========
Write-Host "`n" + ("=" * 50) -ForegroundColor DarkGray
Write-Host "📊 测试总结" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor DarkGray

$totalTests = $script:PassCount + $script:FailCount
$passRate = if ($totalTests -gt 0) { [math]::Round(($script:PassCount / $totalTests) * 100, 1) } else { 0 }

Write-Host "总测试数: $totalTests" -ForegroundColor White
Write-Host "✅ 通过: $($script:PassCount)" -ForegroundColor Green
Write-Host "❌ 失败: $($script:FailCount)" -ForegroundColor Red
Write-Host "通过率: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })

# 如果有失败的测试，给出建议
if ($script:FailCount -gt 0) {
    Write-Host "`n💡 修复建议:" -ForegroundColor Yellow
    foreach ($result in $script:TestResults | Where-Object { -not $_.Success }) {
        Write-Host "  - $($result.TestName): $($result.Message)" -ForegroundColor Gray
    }
}

Write-Host "`n✨ 测试完成!" -ForegroundColor Cyan

# 返回测试结果供其他脚本使用
return @{
    TotalTests = $totalTests
    PassCount = $script:PassCount
    FailCount = $script:FailCount
    PassRate = $passRate
    Results = $script:TestResults
}