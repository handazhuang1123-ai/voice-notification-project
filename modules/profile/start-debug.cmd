@echo off
chcp 65001 >nul
cls

echo.
echo ========================================
echo   Starting Profile Module (DEBUG)
echo   启动个人画像系统（调试模式）
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting backend server (port 3002)...
start "Profile - Backend (DEBUG)" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting frontend server (port 3005)...
start "Profile - Frontend (DEBUG)" cmd /k "cd frontend && pnpm dev"

echo.
echo ✓ Services started in DEBUG mode!
echo.
echo   Backend API:  http://localhost:3002
echo   Frontend UI:  http://localhost:3005
echo.
echo   两个控制台窗口已打开，可查看实时日志
echo   停止服务: 关闭两个控制台窗口或双击 stop.cmd
echo.
echo Press any key to close this window...
pause >nul
