# ==============================================================================
# Script: 创建监控面板快捷方式.ps1
# Purpose: 在桌面创建错误监控面板的快捷方式
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

Write-Host "=== 创建错误监控面板快捷方式 ===" -ForegroundColor Cyan

# 获取桌面路径
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "错误监控面板.lnk"

# 获取当前项目路径（脚本在项目根目录）
$projectPath = $PSScriptRoot
$scriptPath = Join-Path $projectPath ".claude\hooks\Show-ErrorDashboard.ps1"

# 创建快捷方式
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)

# 设置快捷方式属性
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -Command `"& '$scriptPath'`""
$shortcut.WorkingDirectory = $projectPath
$shortcut.WindowStyle = 1  # 1 = Normal window
$shortcut.Description = "语音助手错误监控面板 - 查看系统运行状态和错误统计"
$shortcut.IconLocation = "powershell.exe,0"

# 保存快捷方式
$shortcut.Save()

Write-Host "✓ 快捷方式已创建到桌面: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "使用说明：" -ForegroundColor Yellow
Write-Host "1. 双击桌面上的 [错误监控面板] 图标即可打开" -ForegroundColor White
Write-Host "2. 面板会显示语音助手的运行统计和错误信息" -ForegroundColor White
Write-Host "3. 窗口不会自动关闭，方便查看和操作" -ForegroundColor White
Write-Host ""
Write-Host "面板操作：" -ForegroundColor Yellow
Write-Host "• 刷新数据: 重新运行脚本" -ForegroundColor Gray
Write-Host "• 查看原始数据: 添加 -Raw 参数" -ForegroundColor Gray
Write-Host "• 重置统计: 添加 -Reset 参数" -ForegroundColor Gray
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")