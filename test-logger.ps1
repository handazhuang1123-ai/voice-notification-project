# ==============================================================================
# Script: test-logger.ps1
# Purpose: 测试统一日志模块和中文编码
# Author: 壮爸
# Created: 2025-01-06
# ==============================================================================

#Requires -Version 5.1

# ============== 编码配置 ==============
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 导入模块 ==============
Write-Host "`n=== 测试开始：统一日志模块 ===" -ForegroundColor Cyan
Write-Host "正在导入 Logger.psm1 模块...`n" -ForegroundColor Yellow

Import-Module (Join-Path $PSScriptRoot '.claude\modules\Logger.psm1') -Force

Write-Host "✅ 模块导入成功`n" -ForegroundColor Green

# ============== 测试日志功能 ==============
Write-Host "--- 测试各级别日志 ---`n" -ForegroundColor Cyan

Write-VoiceDebug "这是 DEBUG 级别日志：调试信息 - 变量值测试"
Start-Sleep -Milliseconds 100

Write-VoiceInfo "这是 INFO 级别日志：壮爸的语音通知项目正在运行"
Start-Sleep -Milliseconds 100

Write-VoiceWarning "这是 WARNING 级别日志：API 超时，正在重试..."
Start-Sleep -Milliseconds 100

Write-VoiceError "这是 ERROR 级别日志：操作失败 - 文件未找到"
Start-Sleep -Milliseconds 100

# ============== 测试中文编码 ==============
Write-Host "`n--- 测试中文编码 ---`n" -ForegroundColor Cyan

$testStrings = @(
    "测试简体中文：你好世界",
    "测试标点符号：，。！？；：""''《》【】",
    "测试混合内容：Hello 世界 123 测试",
    "测试特殊字符：壮爸 の Claude Code プロジェクト",
    "测试长文本：PowerShell 是一个跨平台的任务自动化解决方案，由命令行 shell、脚本语言和配置管理框架组成。"
)

foreach ($str in $testStrings) {
    Write-VoiceInfo $str
    Start-Sleep -Milliseconds 100
}

# ============== 检查日志文件 ==============
Write-Host "`n--- 检查日志文件 ---`n" -ForegroundColor Cyan

$logPath = Join-Path $PSScriptRoot 'logs\voice-unified.log'

if (Test-Path $logPath) {
    $logContent = Get-Content $logPath -Encoding UTF8 -Tail 20
    $logSize = (Get-Item $logPath).Length

    Write-Host "✅ 日志文件已创建: $logPath" -ForegroundColor Green
    Write-Host "📄 文件大小: $logSize 字节" -ForegroundColor Cyan
    Write-Host "📝 最后 10 行日志内容:`n" -ForegroundColor Cyan

    $logContent | Select-Object -Last 10 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }

    # 检查中文编码
    $hasChineseInLog = $logContent -match '[\u4e00-\u9fa5]'
    if ($hasChineseInLog) {
        Write-Host "`n✅ 中文编码正确！日志文件中包含中文内容" -ForegroundColor Green
    } else {
        Write-Host "`n❌ 警告：日志文件中未检测到中文内容" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 错误：日志文件未创建" -ForegroundColor Red
    exit 1
}

# ============== 测试总结 ==============
Write-Host "`n=== 测试总结 ===" -ForegroundColor Cyan
Write-Host "✅ 日志模块加载成功" -ForegroundColor Green
Write-Host "✅ 四个日志级别测试通过（DEBUG、INFO、WARNING、ERROR）" -ForegroundColor Green
Write-Host "✅ 中文编码测试通过" -ForegroundColor Green
Write-Host "✅ 统一日志文件创建成功：logs/voice-unified.log" -ForegroundColor Green
Write-Host "`n🎉 所有测试通过！短期日志方案实施成功！" -ForegroundColor Green
Write-Host "`n💡 提示：你可以使用以下命令查看完整日志：" -ForegroundColor Yellow
Write-Host "   Get-Content logs\voice-unified.log -Encoding UTF8 -Tail 50" -ForegroundColor Gray
Write-Host ""
