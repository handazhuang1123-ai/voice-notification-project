# ==============================================================================
# Script: Test-AlignmentDiagnosis.ps1
# Purpose: 诊断中文字符对齐问题的根本原因
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

# ============== 编码配置 ==============
Write-Host "=== 编码和环境诊断 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查控制台编码
Write-Host "[1] 控制台编码设置" -ForegroundColor Yellow
Write-Host "  Console.OutputEncoding: " -NoNewline
Write-Host "$([Console]::OutputEncoding.EncodingName) (CodePage: $([Console]::OutputEncoding.CodePage))" -ForegroundColor White

Write-Host "  Console.InputEncoding:  " -NoNewline
Write-Host "$([Console]::InputEncoding.EncodingName) (CodePage: $([Console]::InputEncoding.CodePage))" -ForegroundColor White

Write-Host "  OutputEncoding:         " -NoNewline
Write-Host "$($OutputEncoding.EncodingName) (CodePage: $($OutputEncoding.CodePage))" -ForegroundColor White

Write-Host ""

# 2. 检查终端字体
Write-Host "[2] 终端信息" -ForegroundColor Yellow
try {
    $windowTitle = $Host.UI.RawUI.WindowTitle
    $bufferSize = $Host.UI.RawUI.BufferSize
    $windowSize = $Host.UI.RawUI.WindowSize

    Write-Host "  窗口标题: $windowTitle" -ForegroundColor White
    Write-Host "  缓冲区大小: $($bufferSize.Width) x $($bufferSize.Height)" -ForegroundColor White
    Write-Host "  窗口大小: $($windowSize.Width) x $($windowSize.Height)" -ForegroundColor White
}
catch {
    Write-Host "  无法获取终端信息: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. 测试字符宽度计算
Write-Host "[3] 字符宽度计算测试" -ForegroundColor Yellow

$testStrings = @(
    @{ Text = "Hello"; Expected = 5 }
    @{ Text = "你好"; Expected = 4 }
    @{ Text = "AI总结"; Expected = 6 }
    @{ Text = "语音播放"; Expected = 8 }
    @{ Text = "消息提取"; Expected = 8 }
    @{ Text = "[░░░░░░░░░░]"; Expected = 12 }
)

foreach ($test in $testStrings) {
    $text = $test.Text
    $expected = $test.Expected

    # 字符串长度
    $strLength = $text.Length

    # 使用 RawUI 计算
    try {
        $displayWidth = $Host.UI.RawUI.LengthInBufferCells($text)
        $match = if ($displayWidth -eq $expected) { "✓" } else { "✗" }
        $color = if ($displayWidth -eq $expected) { "Green" } else { "Red" }

        Write-Host "  '$text'" -NoNewline
        Write-Host " → " -NoNewline -ForegroundColor Gray
        Write-Host "Length=$strLength, " -NoNewline -ForegroundColor Gray
        Write-Host "Display=$displayWidth, " -NoNewline -ForegroundColor $color
        Write-Host "Expected=$expected " -NoNewline -ForegroundColor Gray
        Write-Host $match -ForegroundColor $color
    }
    catch {
        Write-Host "  '$text' → 错误: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 4. 测试 PadRight 行为
Write-Host "[4] PadRight 行为测试" -ForegroundColor Yellow

$line1 = "Hello"
$line2 = "你好"
$targetWidth = 20

Write-Host "  目标宽度: $targetWidth" -ForegroundColor White
Write-Host ""

Write-Host "  使用 PadRight:" -ForegroundColor Gray
$padded1 = $line1.PadRight($targetWidth)
$padded2 = $line2.PadRight($targetWidth)

Write-Host "║$padded1║" -ForegroundColor Cyan
Write-Host "  实际显示宽度: $($Host.UI.RawUI.LengthInBufferCells($padded1))" -ForegroundColor White

Write-Host "║$padded2║" -ForegroundColor Cyan
Write-Host "  实际显示宽度: $($Host.UI.RawUI.LengthInBufferCells($padded2))" -ForegroundColor White

Write-Host ""

# 5. 测试我们的对齐函数
Write-Host "[5] StringAlignment 模块测试" -ForegroundColor Yellow

try {
    Import-Module (Join-Path $PSScriptRoot '..\..\.claude\modules\StringAlignment.psm1') -Force

    Write-Host "  使用 Format-AlignedString:" -ForegroundColor Gray
    $aligned1 = Format-AlignedString -Text $line1 -Width $targetWidth
    $aligned2 = Format-AlignedString -Text $line2 -Width $targetWidth

    Write-Host "║$aligned1║" -ForegroundColor Cyan
    Write-Host "  实际显示宽度: $($Host.UI.RawUI.LengthInBufferCells($aligned1))" -ForegroundColor White

    Write-Host "║$aligned2║" -ForegroundColor Cyan
    Write-Host "  实际显示宽度: $($Host.UI.RawUI.LengthInBufferCells($aligned2))" -ForegroundColor White
}
catch {
    Write-Host "  无法加载 StringAlignment 模块: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 6. 测试实际面板行
Write-Host "[6] 实际面板内容测试" -ForegroundColor Yellow

$panelWidth = 60
$testLines = @(
    "错误监控面板 v1.0",
    "  总体统计",
    "  • 总调用: 0 次",
    "  • AI总结：0 错误  [░░░░░░░░░░] 正常",
    "  • 语音播放：0 错误  [░░░░░░░░░░] 正常",
    "  • 消息提取：0 错误  [░░░░░░░░░░] 正常"
)

Write-Host "  目标面板宽度: $panelWidth" -ForegroundColor White
Write-Host ""

foreach ($line in $testLines) {
    $displayWidth = $Host.UI.RawUI.LengthInBufferCells($line)
    $strLength = $line.Length

    Write-Host "  Line: '$line'" -ForegroundColor Gray
    Write-Host "    String.Length = $strLength" -ForegroundColor Gray
    Write-Host "    Display Width = $displayWidth" -ForegroundColor White

    # 使用我们的对齐函数
    try {
        $aligned = Format-AlignedString -Text $line -Width $panelWidth
        $alignedWidth = $Host.UI.RawUI.LengthInBufferCells($aligned)

        Write-Host "║$aligned║" -ForegroundColor Cyan
        Write-Host "    Aligned Width = $alignedWidth" -ForegroundColor $(if ($alignedWidth -eq $panelWidth) { "Green" } else { "Red" })
    }
    catch {
        Write-Host "    对齐失败: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
}

# 7. 测试字体兼容性
Write-Host "[7] 字体兼容性测试" -ForegroundColor Yellow

$testChars = @(
    @{ Char = "═"; Name = "双线" },
    @{ Char = "║"; Name = "双线竖" },
    @{ Char = "╔"; Name = "双线左上角" },
    @{ Char = "╗"; Name = "双线右上角" },
    @{ Char = "╚"; Name = "双线左下角" },
    @{ Char = "╝"; Name = "双线右下角" },
    @{ Char = "█"; Name = "实心方块" },
    @{ Char = "░"; Name = "空心方块" },
    @{ Char = "你"; Name = "中文字符" },
    @{ Char = "A"; Name = "ASCII字符" }
)

foreach ($test in $testChars) {
    $char = $test.Char
    $name = $test.Name
    $width = $Host.UI.RawUI.LengthInBufferCells($char)

    Write-Host "  '$char' ($name): " -NoNewline
    Write-Host "$width 单元" -ForegroundColor White
}

Write-Host ""

# 8. 总结和建议
Write-Host "[8] 诊断总结" -ForegroundColor Yellow

Write-Host ""
Write-Host "  如果右边框对齐有问题，可能的原因包括：" -ForegroundColor White
Write-Host ""
Write-Host "  1. 终端编码不是 UTF-8" -ForegroundColor Gray
Write-Host "     → 解决: 运行 [Console]::OutputEncoding = [System.Text.Encoding]::UTF8" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 终端字体不支持中文" -ForegroundColor Gray
Write-Host "     → 解决: 使用支持 CJK 的等宽字体（如 MS Gothic、Sarasa Mono SC）" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. LengthInBufferCells 计算不准确" -ForegroundColor Gray
Write-Host "     → 解决: 检查上面的宽度计算测试结果" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. 某些特殊字符宽度不一致" -ForegroundColor Gray
Write-Host "     → 解决: 避免使用宽度不确定的字符（如某些 Emoji）" -ForegroundColor Gray
Write-Host ""
