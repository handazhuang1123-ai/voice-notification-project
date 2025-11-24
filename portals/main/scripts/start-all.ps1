# Start All Services for Main Portal
# Author: 壮爸
# Date: 2025-11-24

Write-Host "===================================" -ForegroundColor Green
Write-Host " Pip-Boy Portal Service Manager    " -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# 设置根目录
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RootPath

Write-Host "Starting services..." -ForegroundColor Cyan

# 1. 启动日志查看器 (端口 55555)
Write-Host "[1/3] Starting Log Viewer on port 55555..." -ForegroundColor Yellow
$logViewer = Start-Process -FilePath "python" `
    -ArgumentList "-m", "http.server", "55555" `
    -WorkingDirectory "$RootPath\viewers\log-viewer" `
    -PassThru `
    -WindowStyle Minimized

# 2. 启动个人画像系统 (端口 3002)
Write-Host "[2/3] Starting Profile System on port 3002..." -ForegroundColor Yellow
$profileSystem = Start-Process -FilePath "node" `
    -ArgumentList "$RootPath\scripts\profile\start.js" `
    -WorkingDirectory $RootPath `
    -PassThru `
    -WindowStyle Minimized

# 等待服务启动
Start-Sleep -Seconds 2

# 3. 启动主门户 (端口 3000)
Write-Host "[3/3] Starting Main Portal on port 3000..." -ForegroundColor Yellow
$mainPortal = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory "$RootPath\portals\main" `
    -PassThru `
    -WindowStyle Normal

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host " All services started successfully " -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  Main Portal:    http://localhost:3000" -ForegroundColor White
Write-Host "  Log Viewer:     http://localhost:55555" -ForegroundColor White
Write-Host "  Profile System: http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# 等待用户按键
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Stopping all services..." -ForegroundColor Red

    # 停止所有进程
    if (-not $logViewer.HasExited) {
        Stop-Process -Id $logViewer.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $profileSystem.HasExited) {
        Stop-Process -Id $profileSystem.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $mainPortal.HasExited) {
        Stop-Process -Id $mainPortal.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Host "All services stopped." -ForegroundColor Red
}