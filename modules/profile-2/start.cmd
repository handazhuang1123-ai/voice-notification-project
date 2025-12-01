@echo off
chcp 65001 >nul
title Profile-2 Server

echo ========================================
echo   Profile-2 Personal Portrait System V2
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend (port 3102)...
start "Profile-2 Backend" cmd /c "cd backend && pnpm dev"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend (port 3002)...
start "Profile-2 Frontend" cmd /c "cd frontend && pnpm dev"

timeout /t 3 /nobreak >nul

echo [3/3] Opening browser...
start http://localhost:3002

echo.
echo ========================================
echo   Services Started!
echo   Frontend: http://localhost:3002
echo   Backend:  http://localhost:3102
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
