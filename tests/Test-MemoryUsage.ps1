# 测试Ollama内存占用
Write-Host "=== Ollama 内存占用测试 ===" -ForegroundColor Cyan

# 检查Ollama进程
$ollamaProcesses = Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}

if ($ollamaProcesses) {
    Write-Host "`n当前Ollama进程内存占用：" -ForegroundColor Yellow
    foreach ($proc in $ollamaProcesses) {
        $memoryMB = [Math]::Round($proc.WorkingSet64/1MB, 2)
        $virtualMB = [Math]::Round($proc.VirtualMemorySize64/1MB, 2)
        Write-Host "  进程: $($proc.ProcessName)"
        Write-Host "    物理内存: $memoryMB MB"
        Write-Host "    虚拟内存: $virtualMB MB"
    }

    $totalMemory = ($ollamaProcesses | Measure-Object WorkingSet64 -Sum).Sum / 1MB
    Write-Host "`n总物理内存占用: $([Math]::Round($totalMemory, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "Ollama进程未运行" -ForegroundColor Red
    Write-Host "正在启动Ollama服务..." -ForegroundColor Yellow

    # 尝试调用一次API来启动Ollama
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2
        Write-Host "Ollama服务已启动" -ForegroundColor Green
    } catch {
        Write-Host "无法连接到Ollama服务" -ForegroundColor Red
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Cyan