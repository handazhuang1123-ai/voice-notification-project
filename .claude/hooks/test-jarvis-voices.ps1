# Jarvis语音测试脚本
# 测试不同情感场景的语音效果

Write-Host "=== Jarvis语音情感测试 ===" -ForegroundColor Cyan
Write-Host "使用男声: zh-CN-YunxiNeural" -ForegroundColor Yellow
Write-Host ""

$scenarios = @(
    @{Text="先生，代码已成功部署到生产环境"; Emotion="success"; Desc="成功场景 ✅"}
    @{Text="先生，检测到5个安全漏洞需要修复"; Emotion="serious"; Desc="严肃场景 ⚠️"}
    @{Text="先生，建议添加单元测试"; Emotion="gentle"; Desc="建议场景 💬"}
    @{Text="先生，分析完成，生成了详细报告"; Emotion="neutral"; Desc="中性场景 📊"}
    @{Text="先生，警告：磁盘空间不足"; Emotion="alert"; Desc="警示场景 🚨"}
)

foreach ($s in $scenarios) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "场景: $($s.Desc)" -ForegroundColor Yellow
    Write-Host "情感: $($s.Emotion)" -ForegroundColor Green
    Write-Host "文本: $($s.Text)" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "正在播放..." -ForegroundColor Magenta

    & .\.claude\hooks\Play-EdgeTTS.ps1 -Text $s.Text -Emotion $s.Emotion -TimeoutSeconds 10

    Write-Host "`n按任意键继续测试下一个场景..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "所有测试完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "测试结果总结：" -ForegroundColor Yellow
Write-Host "✅ 成功场景：语速+15%，音调+10%，音量+12% (积极欢快)"
Write-Host "⚠️  严肃场景：语速-5%，音调-3%，音量+15% (引起注意)"
Write-Host "💬 建议场景：语速+10%，音调+5%，音量+8% (温和友好)"
Write-Host "📊 中性场景：语速+15%，音调+8%，音量+10% (标准专业)"
Write-Host "🚨 警示场景：语速+5%，音调+5%，音量+18% (紧急重要)"
Write-Host ""
Write-Host "Jarvis男声配置完成！按任意键退出..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
