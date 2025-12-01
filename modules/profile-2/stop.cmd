@echo off
chcp 65001 >nul

echo Stopping Profile-2 services...

:: Kill processes on ports 3002 and 3102
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002"') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3102"') do (
    taskkill /F /PID %%a 2>nul
)

echo Done.
pause
