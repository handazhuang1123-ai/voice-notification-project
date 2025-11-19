<#
.SYNOPSIS
    Fix server blocking issue caused by long-polling loop
    修复由长轮询循环导致的服务器阻塞问题

.DESCRIPTION
    This script fixes two critical issues:
    1. Safety check allows loop to run for 56 seconds instead of 28 seconds
    2. Server continues processing even after client disconnects

    此脚本修复两个关键问题：
    1. 安全检查允许循环运行 56 秒而不是 28 秒
    2. 客户端断开后服务器仍继续处理

.NOTES
    Author: 壮爸
    Version: 1.0
    Last Modified: 2025-01-19
#>
[CmdletBinding()]
param()

try {
    Write-Host "=== 修复服务器阻塞问题 ===" -ForegroundColor Cyan
    Write-Host ""

    $ScriptRoot = $PSScriptRoot
    $OpenLogViewerPath = Join-Path $ScriptRoot "Open-LogViewer.ps1"

    # Backup file | 备份文件
    Write-Host "[1/3] 创建备份..." -ForegroundColor Yellow
    $BackupPath = "$OpenLogViewerPath.backup-blocking-fix"
    Copy-Item -Path $OpenLogViewerPath -Destination $BackupPath -Force
    Write-Host "  ✓ 备份已创建：$BackupPath" -ForegroundColor Green
    Write-Host ""

    # Read file | 读取文件
    Write-Host "[2/3] 应用修复..." -ForegroundColor Yellow
    $Content = Get-Content -Path $OpenLogViewerPath -Raw -Encoding UTF8
    $OriginalContent = $Content

    # Fix 1: Change safety check from * 2 to * 1.1
    # 修复 1：将安全检查从 * 2 改为 * 1.1
    $Pattern1 = 'if \(\$LoopIterations -gt \$MaxIterations \* 2\)'
    $Replacement1 = 'if ($LoopIterations -gt ($MaxIterations * 1.1))'

    if ($Content -match $Pattern1) {
        $Content = $Content -replace $Pattern1, $Replacement1
        Write-Host "  ✓ 修复 1：安全检查时间 56秒 → 30.8秒" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ 未找到安全检查代码（可能已修复）" -ForegroundColor Yellow
    }

    # Fix 2: Add client disconnect detection
    # 修复 2：添加客户端断开检测
    $Pattern2 = '(\s+)(\$LoopIterations\+\+\s+# Safety check: prevent infinite loop)'
    $Replacement2 = '$1$2
$1
$1# Check if client disconnected | 检查客户端是否断开
$1if (-not $Response.OutputStream.CanWrite) {
$1    Write-Verbose "Client disconnected, exiting long-polling loop"
$1    break
$1}'

    if ($Content -match $Pattern2) {
        $Content = $Content -replace $Pattern2, $Replacement2
        Write-Host "  ✓ 修复 2：添加客户端断开检测" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ 未找到循环代码位置（尝试手动添加）" -ForegroundColor Yellow

        # 尝试另一个模式
        $Pattern2Alt = '(\s+\$LoopIterations\+\+)\s+'
        if ($Content -match $Pattern2Alt) {
            $Replacement2Alt = '$1

                # Check if client disconnected | 检查客户端是否断开
                if (-not $Response.OutputStream.CanWrite) {
                    Write-Verbose "Client disconnected, exiting long-polling loop"
                    break
                }

                '
            $Content = $Content -replace $Pattern2Alt, $Replacement2Alt, 1
            Write-Host "  ✓ 修复 2：添加客户端断开检测（使用备用模式）" -ForegroundColor Green
        }
    }

    # Save file | 保存文件
    if ($Content -ne $OriginalContent) {
        $Content | Set-Content -Path $OpenLogViewerPath -Encoding UTF8 -NoNewline
        Write-Host ""
        Write-Host "[3/3] 修复应用完成！" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "[3/3] 未发现需要修改的内容" -ForegroundColor Yellow
    }

    # Summary | 总结
    Write-Host ""
    Write-Host "=== 修复摘要 ===" -ForegroundColor Cyan
    Write-Host "✓ 问题 1：长轮询安全检查时间过长"
    Write-Host "  - 原值：允许 112 次循环 = 56 秒"
    Write-Host "  - 新值：允许 61.6 次循环 = 30.8 秒"
    Write-Host "  - 效果：确保循环在 28-31 秒内退出"
    Write-Host ""
    Write-Host "✓ 问题 2：客户端断开后服务器继续处理"
    Write-Host "  - 添加：每次循环检查 Response.OutputStream.CanWrite"
    Write-Host "  - 效果：客户端断开后立即退出循环"
    Write-Host ""
    Write-Host "=== 预期效果 ===" -ForegroundColor Cyan
    Write-Host "1. 长轮询请求不会超过 31 秒"
    Write-Host "2. 客户端取消请求后，服务器立即停止处理"
    Write-Host "3. 服务器主循环不会被阻塞"
    Write-Host "4. 浏览器刷新可以正常工作"
    Write-Host ""
    Write-Host "=== 下一步 ===" -ForegroundColor Yellow
    Write-Host "1. 停止当前服务器（Ctrl+C）"
    Write-Host "2. 重新运行 Open-LogViewer.ps1"
    Write-Host "3. 观察是否还会出现 35 秒超时"
    Write-Host "4. 测试浏览器刷新是否正常"
    Write-Host ""
    Write-Host "如果需要恢复原始文件，运行：" -ForegroundColor Gray
    Write-Host "  Copy-Item '$BackupPath' '$OpenLogViewerPath' -Force"
    Write-Host ""

}
catch {
    Write-Error "修复应用失败: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
