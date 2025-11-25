@echo off
chcp 65001 >nul
cls

echo.
echo ========================================
echo   Stopping Log Viewer Module
echo   停止日志查看器模块
echo ========================================
echo.

cd /d "%~dp0"

echo 正在查找并停止相关进程...
echo.

REM 停止占用 3001 端口的进程 (Backend)
echo [1/2] 停止 Backend 服务 (端口 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! == 0 (
        echo   ✓ 已停止进程 PID: %%a
    )
)

REM 停止占用 3004 端口的进程 (Frontend)
echo [2/2] 停止 Frontend 服务 (端口 3004)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3004 ^| findstr LISTENING') do (
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
