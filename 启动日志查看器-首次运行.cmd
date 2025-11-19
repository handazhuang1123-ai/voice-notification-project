@echo off
REM 首次启动 Pip-Boy 日志查看器（完整检查）
REM 会自动安装依赖和编译 TypeScript

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File ".\scripts\viewers\log-viewers\Start-NodeLogViewer.ps1"

pause
