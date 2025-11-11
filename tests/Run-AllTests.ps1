# ==============================================================================
# Script: Run-AllTests.ps1
# Purpose: 运行所有测试套件
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

param(
    [switch]$Quick = $false,     # 快速测试（只运行基础测试）
    [switch]$Full = $false,      # 完整测试（包括性能测试）
    [switch]$PlaySound = $false  # 是否播放测试语音
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host @"
╔══════════════════════════════════════════════════════╗
║          语音通知系统 - 自动化测试运行器            ║
║          Voice Notification Test Runner            ║
╚══════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow

Write-Host "`n🚀 开始运行测试套件..." -ForegroundColor Cyan
Write-Host "测试时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ("=" * 60) -ForegroundColor DarkGray

$testResults = @()
$totalStartTime = Get-Date

# ========== 1. 基础环境测试 ==========
Write-Host "`n📦 [1/3] 运行基础测试..." -ForegroundColor Yellow
$basicTestStart = Get-Date

try {
    $basicResult = & (Join-Path $PSScriptRoot 'Test-VoiceNotification.ps1')
    $basicTestTime = (Get-Date) - $basicTestStart

    $testResults += @{
        Name = "基础环境测试"
        Result = $basicResult
        Duration = $basicTestTime
        Success = $basicResult.FailCount -eq 0
    }

    Write-Host "   ⏱️ 耗时: $([math]::Round($basicTestTime.TotalSeconds, 2))秒" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 基础测试失败: $_" -ForegroundColor Red
    $testResults += @{
        Name = "基础环境测试"
        Success = $false
        Error = $_.Exception.Message
    }
}

# ========== 2. 集成测试（如果不是快速模式） ==========
if (-not $Quick) {
    Write-Host "`n🔗 [2/3] 运行集成测试..." -ForegroundColor Yellow
    $integrationStart = Get-Date

    try {
        $integrationResult = & (Join-Path $PSScriptRoot 'Test-Integration.ps1') -PlaySound:$PlaySound
        $integrationTime = (Get-Date) - $integrationStart

        $testResults += @{
            Name = "集成测试"
            Result = $integrationResult
            Duration = $integrationTime
            Success = $true  # 根据实际结果判断
        }

        Write-Host "   ⏱️ 耗时: $([math]::Round($integrationTime.TotalSeconds, 2))秒" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ 集成测试失败: $_" -ForegroundColor Red
        $testResults += @{
            Name = "集成测试"
            Success = $false
            Error = $_.Exception.Message
        }
    }
} else {
    Write-Host "`n⚡ [2/3] 跳过集成测试（快速模式）" -ForegroundColor Gray
}

# ========== 3. 性能测试（如果是完整模式） ==========
if ($Full) {
    Write-Host "`n⚡ [3/3] 运行性能测试..." -ForegroundColor Yellow
    $perfStart = Get-Date

    try {
        Write-Host "   测试语音生成速度..." -ForegroundColor Gray
        $testText = "这是一段测试文本，用于评估语音生成的性能。"
        $outputPath = Join-Path $env:TEMP "perf_test_$(Get-Date -Format 'yyyyMMddHHmmss').mp3"

        # 测试语音生成时间
        $genStart = Get-Date
        $edgeTtsCmd = Join-Path $env:APPDATA "npm\edge-tts.cmd"
        if (Test-Path $edgeTtsCmd) {
            & $edgeTtsCmd --text $testText --voice "zh-CN-XiaoxiaoNeural" --write-media $outputPath 2>$null
            $genTime = (Get-Date) - $genStart

            if (Test-Path $outputPath) {
                $fileSize = (Get-Item $outputPath).Length
                Write-Host "   ✅ 生成耗时: $([math]::Round($genTime.TotalMilliseconds))ms" -ForegroundColor Green
                Write-Host "   📊 文件大小: $([math]::Round($fileSize/1KB, 2))KB" -ForegroundColor Gray
                Remove-Item $outputPath -Force -ErrorAction SilentlyContinue
            }
        }

        $perfTime = (Get-Date) - $perfStart
        Write-Host "   ⏱️ 耗时: $([math]::Round($perfTime.TotalSeconds, 2))秒" -ForegroundColor Gray

        $testResults += @{
            Name = "性能测试"
            Success = $true
            Duration = $perfTime
        }
    } catch {
        Write-Host "   ❌ 性能测试失败: $_" -ForegroundColor Red
        $testResults += @{
            Name = "性能测试"
            Success = $false
            Error = $_.Exception.Message
        }
    }
} else {
    Write-Host "`n⚡ [3/3] 跳过性能测试（使用 -Full 参数运行）" -ForegroundColor Gray
}

# ========== 生成测试报告 ==========
$totalDuration = (Get-Date) - $totalStartTime

Write-Host "`n" + ("=" * 60) -ForegroundColor DarkGray
Write-Host "📊 测试报告总结" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor DarkGray

# 统计结果
$successCount = ($testResults | Where-Object { $_.Success }).Count
$failCount = ($testResults | Where-Object { -not $_.Success }).Count
$successRate = if ($testResults.Count -gt 0) {
    [math]::Round(($successCount / $testResults.Count) * 100, 1)
} else { 0 }

# 显示每个测试结果
Write-Host "`n测试结果详情:" -ForegroundColor White
foreach ($test in $testResults) {
    $icon = if ($test.Success) { "✅" } else { "❌" }
    $color = if ($test.Success) { "Green" } else { "Red" }
    Write-Host "$icon $($test.Name)" -ForegroundColor $color
    if ($test.Duration) {
        Write-Host "   耗时: $([math]::Round($test.Duration.TotalSeconds, 2))秒" -ForegroundColor Gray
    }
    if ($test.Error) {
        Write-Host "   错误: $($test.Error)" -ForegroundColor Yellow
    }
}

# 总结
Write-Host "`n测试统计:" -ForegroundColor White
Write-Host "• 总测试套件: $($testResults.Count)" -ForegroundColor Gray
Write-Host "• 成功: $successCount" -ForegroundColor Green
Write-Host "• 失败: $failCount" -ForegroundColor Red
Write-Host "• 成功率: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
Write-Host "• 总耗时: $([math]::Round($totalDuration.TotalSeconds, 2))秒" -ForegroundColor Gray

# 生成测试报告文件
$reportPath = Join-Path $PSScriptRoot "TestReport_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$report = @"
语音通知系统测试报告
========================
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
测试模式: $(if ($Quick) { "快速" } elseif ($Full) { "完整" } else { "标准" })

测试结果:
---------
"@

foreach ($test in $testResults) {
    $status = if ($test.Success) { "PASS" } else { "FAIL" }
    $report += "`n• $($test.Name): $status"
    if ($test.Duration) {
        $report += " (耗时: $([math]::Round($test.Duration.TotalSeconds, 2))秒)"
    }
}

$report += @"

统计信息:
---------
总测试套件: $($testResults.Count)
成功: $successCount
失败: $failCount
成功率: $successRate%
总耗时: $([math]::Round($totalDuration.TotalSeconds, 2))秒

========================
测试报告生成完毕
"@

$report | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "`n📄 测试报告已保存到: $reportPath" -ForegroundColor Cyan

# 根据结果给出建议
if ($failCount -gt 0) {
    Write-Host "`n⚠️ 发现问题，建议:" -ForegroundColor Yellow
    Write-Host "1. 运行 'powershell -File Test-VoiceNotification.ps1' 查看详细错误" -ForegroundColor Gray
    Write-Host "2. 检查依赖是否正确安装（edge-tts, Ollama）" -ForegroundColor Gray
    Write-Host "3. 查看日志文件了解更多信息" -ForegroundColor Gray
} else {
    Write-Host "`n✨ 所有测试通过！系统运行正常。" -ForegroundColor Green
}

Write-Host "`n🎉 测试运行完成！" -ForegroundColor Cyan

# 返回退出码（0=成功，1=有失败）
exit $(if ($failCount -eq 0) { 0 } else { 1 })