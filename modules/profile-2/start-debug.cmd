@echo off
chcp 65001 >nul
title Profile-2 Debug Mode

echo ========================================
echo   Profile-2 Debug Mode
echo ========================================
echo.

cd /d "%~dp0"

echo Starting Backend in foreground (port 3102)...
echo Press Ctrl+C to stop
echo.

cd backend
pnpm dev
