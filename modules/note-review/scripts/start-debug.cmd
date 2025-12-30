@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [调试模式] Note-Review
echo.
echo 可用命令:
echo   pnpm generate  - 生成今日问题
echo   pnpm send      - 发送邮件
echo   pnpm list      - 查看历史
echo   pnpm start     - 启动定时服务
echo   pnpm start --now - 启动并立即执行一次
echo.
cmd /k
