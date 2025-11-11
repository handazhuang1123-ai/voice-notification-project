# ==============================================================================
# Script: Test-EmotionMapping.ps1
# Purpose: 测试情感映射规则
# Author: 壮爸
# Created: 2025-01-08
# ==============================================================================

#Requires -Version 5.1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          情感映射规则测试                                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$playScript = ".\.claude\hooks\Play-EdgeTTS.ps1"

if (!(Test-Path $playScript)) {
    Write-Host "✗ Play-EdgeTTS.ps1 未找到" -ForegroundColor Red
    exit 1
}

# 测试文本和预期情感映射
$testCases = @(
    @{
        Category = "成功/完成"
        Text = "任务成功完成！所有文件已生成。"
        ExpectedEmotion = "cheerful"
        Description = "包含'成功'和'完成'关键词 → cheerful"
    },
    @{
        Category = "错误/失败"
        Text = "检测到错误，编译失败。请检查代码。"
        ExpectedEmotion = "calm"
        Description = "包含'错误'和'失败'关键词 → calm"
    },
    @{
        Category = "重要/警告"
        Text = "重要提示：系统将在5分钟后重启。"
        ExpectedEmotion = "serious"
        Description = "包含'重要'关键词 → serious"
    },
    @{
        Category = "建议/询问"
        Text = "建议优化代码结构。需要我帮你重构吗？"
        ExpectedEmotion = "gentle"
        Description = "包含'建议'和'需要'关键词 → gentle"
    }
)

$index = 1
foreach ($test in $testCases) {
    Write-Host "[$index/$($testCases.Count)] " -NoNewline -ForegroundColor Yellow
    Write-Host "测试: $($test.Category)" -ForegroundColor Cyan
    Write-Host "    文本: " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($test.Text)" -ForegroundColor White
    Write-Host "    预期情感: " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($test.ExpectedEmotion)" -ForegroundColor Magenta
    Write-Host "    说明: $($test.Description)" -ForegroundColor DarkGray
    Write-Host "    播放中..." -NoNewline -ForegroundColor Yellow

    try {
        # 不指定 EmotionStyle，让系统自动检测
        $result = & $playScript -Text $test.Text

        if ($result.Success) {
            Write-Host " ✓" -ForegroundColor Green
        } else {
            Write-Host " ✗ 失败: $($result.Error)" -ForegroundColor Red
        }
    } catch {
        Write-Host " ✗ 错误: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    $index++

    # 等待播放完成
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  测试完成！你听到不同的情感表达了吗？                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意：自动情感检测依赖 voice-config.json 中的 UseAutoDetection 设置" -ForegroundColor Yellow
Write-Host "配置文件位置: .claude\hooks\voice-config.json" -ForegroundColor Yellow
Write-Host ""
