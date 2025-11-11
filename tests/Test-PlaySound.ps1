# ==============================================================================
# Script: Test-PlaySound.ps1
# Purpose: 测试语音播放功能
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

param(
    [string]$Text = "测试语音播放功能，任务已完成",
    [string]$Voice = "zh-CN-XiaoxiaoNeural",
    [string]$Emotion = "cheerful"
)

Write-Host @"
╔══════════════════════════════════════════════╗
║          语音播放测试                       ║
║          Test Voice Playback                ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host "`n🔊 准备播放测试语音..." -ForegroundColor Yellow
Write-Host "文本: $Text" -ForegroundColor Gray
Write-Host "语音: $Voice" -ForegroundColor Gray
Write-Host "情感: $Emotion" -ForegroundColor Gray

# 调用播放脚本
$playScript = Join-Path $PSScriptRoot '..\\.claude\hooks\Play-EdgeTTS.ps1'

if (Test-Path $playScript) {
    Write-Host "`n▶️ 开始播放..." -ForegroundColor Cyan

    try {
        & $playScript -Text $Text -Voice $Voice -EmotionStyle $Emotion

        Write-Host "✅ 播放完成！" -ForegroundColor Green
        Write-Host "`n如果你听到了语音，说明系统工作正常。" -ForegroundColor Gray
        Write-Host "如果没有听到，请检查：" -ForegroundColor Yellow
        Write-Host "  1. 音量是否开启" -ForegroundColor Gray
        Write-Host "  2. edge-tts 是否正确安装" -ForegroundColor Gray
        Write-Host "  3. 音频设备是否正常" -ForegroundColor Gray
    } catch {
        Write-Host "❌ 播放失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 找不到播放脚本: $playScript" -ForegroundColor Red
}

Write-Host "`n✨ 测试结束" -ForegroundColor Cyan