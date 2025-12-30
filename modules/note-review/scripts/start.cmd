@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 启动 Note-Review 服务...
pnpm start
pause
