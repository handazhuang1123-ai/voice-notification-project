@echo off
REM 启动 Pip-Boy 日志查看器（快速启动）
REM 跳过依赖检查和编译步骤，启动更快
REM 如果出现问题，请使用"启动日志查看器-首次运行.cmd"

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File ".\scripts\viewers\log-viewers\Start-NodeLogViewer.ps1" -SkipDependencyCheck -SkipBuild

pause
