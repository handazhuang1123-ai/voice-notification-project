# 测试不同男声效果
# 对比不同男声的音色特点

Write-Host "=== 测试不同男声音色 ===" -ForegroundColor Cyan
Write-Host ""

$voices = @(
    @{Name="Yunxi（推荐）"; Voice="zh-CN-YunxiNeural"; Desc="年轻、活力、友好 - 最接近Jarvis"},
    @{Name="Yunyang（新闻）"; Voice="zh-CN-YunyangNeural"; Desc="新闻播音、专业"},
    @{Name="Yunjian（成熟）"; Voice="zh-CN-YunjianNeural"; Desc="成熟、稳重"},
    @{Name="Yunhao（热情）"; Voice="zh-CN-YunhaoNeural"; Desc="广告配音、热情"}
)

$testText = "先生，认证问题已成功修复"

foreach ($v in $voices) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "测试语音: $($v.Name)" -ForegroundColor Yellow
    Write-Host "音色: $($v.Desc)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    & .\.claude\hooks\Play-EdgeTTS.ps1 -Text $testText -Voice $v.Voice -Emotion "neutral"

    Write-Host ""
    Write-Host "按任意键继续测试下一个..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "男声测试完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "推荐：使用 YunxiNeural (zh-CN-YunxiNeural)" -ForegroundColor Yellow
Write-Host "它具有年轻、活力的特点，最接近Jarvis风格" -ForegroundColor Yellow
