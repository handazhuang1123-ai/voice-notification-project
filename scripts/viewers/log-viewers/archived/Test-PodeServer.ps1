<#
.SYNOPSIS
    Test Pode server - verify basic functionality
    测试 Pode 服务器 - 验证基础功能

.DESCRIPTION
    A minimal Pode server to test installation and basic features
    最小化 Pode 服务器，测试安装和基础功能

.NOTES
    Author: 壮爸
    Version: 1.0
#>

Write-Host "=== Testing Pode Server ===" -ForegroundColor Cyan
Write-Host "Starting minimal Pode server on http://localhost:8080..." -ForegroundColor Green

# Import Pode module | 导入 Pode 模块
Import-Module Pode

# Start Pode server with 4 threads | 启动 4 线程 Pode 服务器
Start-PodeServer -Threads 4 {
    # Add endpoint for root | 添加根端点
    Add-PodeEndpoint -Address localhost -Port 8080 -Protocol Http

    # Simple test route | 简单测试路由
    Add-PodeRoute -Method Get -Path '/' -ScriptBlock {
        Write-PodeJsonResponse @{
            message = "Pode server is working! 🎉"
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            threadId = [System.Threading.Thread]::CurrentThread.ManagedThreadId
        }
    }

    # Test long-polling simulation | 测试长轮询模拟
    Add-PodeRoute -Method Get -Path '/test-longpoll' -ScriptBlock {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Long-poll request received on thread $([System.Threading.Thread]::CurrentThread.ManagedThreadId)" -ForegroundColor Yellow

        # Simulate 5 second wait | 模拟 5 秒等待
        Start-Sleep -Seconds 5

        Write-PodeJsonResponse @{
            message = "Long-poll completed"
            waitTime = "5 seconds"
            threadId = [System.Threading.Thread]::CurrentThread.ManagedThreadId
        }
    }

    # Static file test | 静态文件测试
    Add-PodeRoute -Method Get -Path '/static-test' -ScriptBlock {
        Write-PodeTextResponse -Value "Static content works!"
    }
}
