# ==============================================================================
# 临时测试脚本：测试 dispatcher.ps1 是否能正确调用 voice-summary.ps1
# ==============================================================================

Write-Host "=== 开始测试 dispatcher.ps1 ===" -ForegroundColor Cyan
Write-Host ""

# 模拟 Claude Code 传递给 Hook 的 JSON 输入
$hookInput = @{
    transcript_path = "C:\Users\Administrator\.claude\projects\H--HZH-Little-Projects-voice-notification-project\d69bd957-81e2-4db4-a73e-57e2d23c5b74.jsonl"
} | ConvertTo-Json

Write-Host "模拟的Hook输入:" -ForegroundColor Yellow
Write-Host $hookInput -ForegroundColor Gray
Write-Host ""

# 创建临时输入文件
$tempInputFile = Join-Path $env:TEMP "dispatcher-test-input.json"
$hookInput | Out-File -FilePath $tempInputFile -Encoding UTF8 -NoNewline

Write-Host "临时输入文件: $tempInputFile" -ForegroundColor Gray
Write-Host ""

# 通过重定向stdin的方式调用dispatcher
Get-Content $tempInputFile | & "H:\HZH\Little-Projects\voice-notification-project\.claude\hooks\dispatcher.ps1"

# 清理临时文件
Remove-Item $tempInputFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "请检查上面的日志，看是否显示 [voice-summary.ps1] 而不是 [voice-notification.ps1]" -ForegroundColor Yellow
