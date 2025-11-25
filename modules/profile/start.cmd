@echo off
chcp 65001 >nul
cls

echo.
echo ========================================
echo   Starting Profile Module
echo   启动个人画像系统（后台模式）
echo ========================================
echo.

cd /d "%~dp0"

REM 使用 VBScript 隐藏窗口启动
echo 正在后台启动服务...
cscript //nologo start-hidden.vbs

echo 等待服务启动并自动打开浏览器...
timeout /t 8 /nobreak >nul

echo.
echo ✓ 服务已在后台启动！
echo.
echo   Backend API:  http://localhost:3002
echo   Frontend UI:  http://localhost:3005
echo.
echo   停止服务: 双击 stop.cmd
echo.
timeout /t 2 /nobreak >nul
