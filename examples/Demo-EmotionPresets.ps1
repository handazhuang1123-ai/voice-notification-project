# ==============================================================================
# Script: Demo-EmotionPresets.ps1
# Purpose: 演示所有情感预设音效
# Author: 壮爸
# Created: 2025-01-07
# ==============================================================================

#Requires -Version 5.1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Edge-TTS 情感预设音效演示                             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$playScript = ".\.claude\hooks\Play-EdgeTTS.ps1"

if (!(Test-Path $playScript)) {
    Write-Host "✗ Play-EdgeTTS.ps1 未找到" -ForegroundColor Red
    exit 1
}

# 情感预设演示
$presets = @(
    @{
        Name = "Jarvis 专业助手"
        Emotion = "assistant"
        Text = "先生，系统分析完成。已识别3个优化点，性能提升预计达到40%。"
        Description = "专业、高效、精准 - 适合任务完成通知"
    },
    @{
        Name = "友好提示"
        Emotion = "chat"
        Text = "嗨，刚才帮你完成了文档整理，一共5个章节，看起来不错哦。"
        Description = "轻松、自然、友好 - 适合日常通知"
    },
    @{
        Name = "愉快庆祝"
        Emotion = "cheerful"
        Text = "太棒了！任务成功完成，所有测试都通过了！"
        Description = "欢快、积极、充满活力 - 适合成功完成"
    },
    @{
        Name = "冷静处理"
        Emotion = "calm"
        Text = "检测到错误，请保持冷静。系统正在自动修复，预计需要2分钟。"
        Description = "平静、稳定、舒缓 - 适合错误提示"
    },
    @{
        Name = "严肃公告"
        Emotion = "serious"
        Text = "重要通知：系统将在10分钟后进行安全更新，请保存您的工作。"
        Description = "认真、正式、严肃 - 适合重要提醒"
    },
    @{
        Name = "温柔建议"
        Emotion = "gentle"
        Text = "建议优化代码结构，这样可以提高可读性。需要我帮你重构吗？"
        Description = "柔和、细腻、温柔 - 适合建议和询问"
    }
)

$index = 1
foreach ($preset in $presets) {
    Write-Host "[$index/$($presets.Count)] " -NoNewline -ForegroundColor Yellow
    Write-Host "$($preset.Name) " -NoNewline -ForegroundColor Cyan
    Write-Host "($($preset.Emotion))" -ForegroundColor Gray
    Write-Host "    说明: $($preset.Description)" -ForegroundColor DarkGray
    Write-Host "    文本: " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($preset.Text)" -ForegroundColor White
    Write-Host "    播放中..." -NoNewline -ForegroundColor Yellow

    try {
        $result = & $playScript -Text $preset.Text -EmotionStyle $preset.Emotion

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
Write-Host "║  演示完成！你可以在 voice-config.json 中配置默认情感            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置文件位置: .claude\hooks\voice-config.json" -ForegroundColor Yellow
Write-Host ""
