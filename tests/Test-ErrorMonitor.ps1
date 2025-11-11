# 测试错误监控系统
Write-Host "=== 测试错误监控系统 ===" -ForegroundColor Cyan

# 加载模块
$modulePath = Join-Path (Split-Path $PSScriptRoot -Parent) '.claude\modules\ErrorMonitor.psm1'
Import-Module $modulePath -Force

# 初始化
Initialize-ErrorMonitor

Write-Host "`n模拟一些调用和错误..." -ForegroundColor Yellow

# 模拟Extract组件
Record-Call -Component "Extract"
Record-Call -Component "Extract"
Record-Error -Component "Extract" -ErrorType "文件不存在" `
    -ErrorMessage "Transcript file not found: test.json" -ScriptName "Extract-Messages.ps1"

# 模拟AI组件
Record-Call -Component "AI"
Record-Call -Component "AI"
Record-Call -Component "AI"
Record-Error -Component "AI" -ErrorType "服务未启动" `
    -ErrorMessage "Ollama service not responding" -ScriptName "Generate-VoiceSummary-v2.ps1"
Record-Error -Component "AI" -ErrorType "网络超时" `
    -ErrorMessage "API timeout after 10 seconds" -ScriptName "Generate-VoiceSummary-v2.ps1"

# 模拟TTS组件
Record-Call -Component "TTS"
Record-Call -Component "TTS"
Record-Call -Component "TTS"
Record-Call -Component "TTS"
Record-Error -Component "TTS" -ErrorType "格式错误" `
    -ErrorMessage "Invalid SSML format" -ScriptName "Play-EdgeTTS.ps1"

Write-Host "`n获取统计数据..." -ForegroundColor Yellow
$stats = Get-ErrorStatistics

Write-Host "`n统计结果:" -ForegroundColor Green
Write-Host "总调用: $($stats.Summary.TotalCalls)"
Write-Host "总错误: $($stats.Summary.TotalErrors)"
Write-Host "错误率: $($stats.Summary.ErrorRate)%"

Write-Host "`n组件错误分布:" -ForegroundColor Green
$stats.ByComponent | Format-Table -AutoSize

Write-Host "`n错误类型分布:" -ForegroundColor Green
$stats.ByType | Format-Table -AutoSize

Write-Host "`n最近错误:" -ForegroundColor Green
$stats.Timeline | Select-Object -First 3 | Format-List

Write-Host "`n测试完成！" -ForegroundColor Cyan
Write-Host "运行 Show-ErrorDashboard.ps1 查看可视化面板" -ForegroundColor Gray