@echo off
chcp 65001 >nul
cls

echo.
echo ========================================
echo   Stopping Profile Module
echo   停止个人画像系统
echo ========================================
echo.

cd /d "%~dp0"

echo 正在查找并停止相关进程...
echo.

REM 停止占用 3002 端口的进程 (Backend)
echo [1/2] 停止 Backend 服务 (端口 3002)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! == 0 (
        echo   ✓ 已停止进程 PID: %%a
    )
)

REM 停止占用 3005 端口的进程 (Frontend)
echo [2/2] 停止 Frontend 服务 (端口 3005)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! == 0 (
        echo   ✓ 已停止进程 PID: %%a
    )
)

echo.
echo ✓ 所有服务已停止
echo.
echo 按任意键退出...
pause >nul
