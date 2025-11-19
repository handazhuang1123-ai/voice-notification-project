<#
.SYNOPSIS
    Apply timeout fixes to resolve long-polling timeout issues
    应用超时修复以解决长轮询超时问题

.DESCRIPTION
    This script applies the following fixes:
    1. Reduce LONG_POLL_TIMEOUT_SECONDS from 30 to 28 seconds in Open-LogViewer.ps1
    2. Reduce Test-LogComplete MaxWaitSeconds from 60 to 25 seconds in Open-LogViewer.ps1
    3. Add error recovery mechanism in app.js (reset after 10 consecutive failures)

    此脚本应用以下修复：
    1. 将 Open-LogViewer.ps1 中的 LONG_POLL_TIMEOUT_SECONDS 从 30 秒减少到 28 秒
    2. 将 Open-LogViewer.ps1 中的 Test-LogComplete MaxWaitSeconds 从 60 秒减少到 25 秒
    3. 在 app.js 中添加错误恢复机制（10次连续失败后重置）

.NOTES
    Author: 壮爸
    Version: 1.0
    Last Modified: 2025-01-19
#>
[CmdletBinding()]
param()

try {
    Write-Host "=== 应用长轮询超时修复 ===" -ForegroundColor Cyan
    Write-Host ""

    $ScriptRoot = $PSScriptRoot
    $ProjectRoot = Split-Path -Path $ScriptRoot -Parent  # -> scripts/viewers
    $ProjectRoot = Split-Path -Path $ProjectRoot -Parent  # -> scripts
    $ProjectRoot = Split-Path -Path $ProjectRoot -Parent  # -> project root

    # File paths | 文件路径
    $OpenLogViewerPath = Join-Path $ScriptRoot "Open-LogViewer.ps1"
    $AppJsPath = Join-Path $ProjectRoot "viewers\log-viewer\js\app.js"

    # Backup files | 备份文件
    Write-Host "[1/4] 创建备份..." -ForegroundColor Yellow
    Copy-Item -Path $OpenLogViewerPath -Destination "$OpenLogViewerPath.backup" -Force
    Copy-Item -Path $AppJsPath -Destination "$AppJsPath.backup" -Force
    Write-Host "  ✓ 备份已创建：" -ForegroundColor Green
    Write-Host "    - $OpenLogViewerPath.backup"
    Write-Host "    - $AppJsPath.backup"
    Write-Host ""

    # Fix 1: Modify Open-LogViewer.ps1 - LONG_POLL_TIMEOUT_SECONDS
    Write-Host "[2/4] 修改 Open-LogViewer.ps1 - 长轮询超时..." -ForegroundColor Yellow
    $Content = Get-Content -Path $OpenLogViewerPath -Raw -Encoding UTF8
    $OriginalContent = $Content

    # Change LONG_POLL_TIMEOUT_SECONDS from 30 to 28
    $Content = $Content -replace '\$LONG_POLL_TIMEOUT_SECONDS = 30', '$LONG_POLL_TIMEOUT_SECONDS = 28'

    # Change MaxWaitSeconds in Test-LogComplete call from 60 to 25
    $Content = $Content -replace '(\$IsComplete = Test-LogComplete[^\r\n]+\r?\n[^\r\n]+\r?\n[^\r\n]+\r?\n[^\r\n]+\r?\n[^\r\n]+-MaxWaitSeconds\s+)60', '${1}25'

    if ($Content -ne $OriginalContent) {
        $Content | Set-Content -Path $OpenLogViewerPath -Encoding UTF8 -NoNewline
        Write-Host "  ✓ 已修改：" -ForegroundColor Green
        Write-Host "    - LONG_POLL_TIMEOUT_SECONDS: 30s → 28s"
        Write-Host "    - Test-LogComplete MaxWaitSeconds: 60s → 25s"
    }
    else {
        Write-Host "  ⚠ 未发现需要修改的内容" -ForegroundColor Yellow
    }
    Write-Host ""

    # Fix 2: Modify app.js - Error recovery mechanism
    Write-Host "[3/4] 修改 app.js - 错误恢复机制..." -ForegroundColor Yellow
    $AppJsContent = Get-Content -Path $AppJsPath -Raw -Encoding UTF8
    $OriginalAppJsContent = $AppJsContent

    # Find the exponential backoff section and add reset logic
    $Pattern = '(\s+)(if \(consecutiveErrors > 0\) \{\s+retryDelay = Math\.min\(\s+retryDelay \* CONFIG\.RETRY_BACKOFF_MULTIPLIER,\s+CONFIG\.RETRY_MAX_DELAY_MS\s+\);)'
    $Replacement = '${1}if (consecutiveErrors > 0) {
${1}    retryDelay = Math.min(
${1}        retryDelay * CONFIG.RETRY_BACKOFF_MULTIPLIER,
${1}        CONFIG.RETRY_MAX_DELAY_MS
${1}    );
${1}
${1}    // Auto-reset after too many failures | 失败次数过多后自动重置
${1}    if (consecutiveErrors > 10) {
${1}        console.warn(''⚠️ Too many failures, resetting retry delay...'');
${1}        consecutiveErrors = 0;
${1}        retryDelay = CONFIG.RETRY_BASE_DELAY_MS;
${1}    }'

    if ($AppJsContent -match $Pattern) {
        $AppJsContent = $AppJsContent -replace $Pattern, $Replacement
    }

    if ($AppJsContent -ne $OriginalAppJsContent) {
        $AppJsContent | Set-Content -Path $AppJsPath -Encoding UTF8 -NoNewline
        Write-Host "  ✓ 已添加错误恢复机制（10次失败后重置）" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ 未发现需要修改的内容或已存在修复" -ForegroundColor Yellow
    }
    Write-Host ""

    # Summary | 总结
    Write-Host "[4/4] 修复应用完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== 修改摘要 ===" -ForegroundColor Cyan
    Write-Host "✓ Open-LogViewer.ps1:"
    Write-Host "  - 长轮询超时: 30s → 28s"
    Write-Host "  - Test-LogComplete 超时: 60s → 25s"
    Write-Host ""
    Write-Host "✓ app.js:"
    Write-Host "  - 添加错误恢复机制（10次失败后自动重置）"
    Write-Host ""
    Write-Host "=== 时序配置 ===" -ForegroundColor Cyan
    Write-Host "FileSystemWatcher 最大等待: 25秒"
    Write-Host "服务器长轮询超时: 28秒"
    Write-Host "客户端超时: 35秒"
    Write-Host "时序关系: 25s < 28s < 35s ✓"
    Write-Host ""
    Write-Host "=== 下一步 ===" -ForegroundColor Yellow
    Write-Host "1. 重新运行 Open-LogViewer.ps1 启动服务器"
    Write-Host "2. 测试长轮询功能是否正常工作"
    Write-Host "3. 触发语音通知，观察日志更新是否及时"
    Write-Host ""
    Write-Host "如果需要恢复原始文件，运行：" -ForegroundColor Gray
    Write-Host "  Copy-Item '$OpenLogViewerPath.backup' '$OpenLogViewerPath' -Force"
    Write-Host "  Copy-Item '$AppJsPath.backup' '$AppJsPath' -Force"
    Write-Host ""

}
catch {
    Write-Error "修复应用失败: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
