@echo off
title Pip-Boy Portal Service Manager
echo ===================================
echo  Pip-Boy Portal Service Manager
echo ===================================
echo.

REM 设置根目录
cd /d %~dp0\..\..

echo Starting services...

REM 1. 启动日志查看器 (端口 55555)
echo [1/3] Starting Log Viewer on port 55555...
start /min "Log Viewer" python -m http.server 55555 --directory viewers\log-viewer

REM 2. 启动个人画像系统 (端口 3002)
echo [2/3] Starting Profile System on port 3002...
start /min "Profile System" node scripts\profile\start.js

REM 等待服务启动
timeout /t 2 /nobreak > nul

REM 3. 启动主门户 (端口 3000)
echo [3/3] Starting Main Portal on port 3000...
cd portals\main
start "Main Portal" npm run dev

echo.
echo ===================================
echo  All services started successfully
echo ===================================
echo.
echo Access Points:
echo   Main Portal:    http://localhost:3000
echo   Log Viewer:     http://localhost:55555
echo   Profile System: http://localhost:3002
echo.
echo Press any key to stop all services...
pause > nul

echo.
echo Stopping all services...
taskkill /f /fi "WindowTitle eq Log Viewer*" > nul 2>&1
taskkill /f /fi "WindowTitle eq Profile System*" > nul 2>&1
taskkill /f /fi "WindowTitle eq Main Portal*" > nul 2>&1

echo All services stopped.
pause