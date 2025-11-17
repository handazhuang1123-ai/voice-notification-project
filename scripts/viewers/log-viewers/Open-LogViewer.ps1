<#
.SYNOPSIS
    Open the Pip-Boy log viewer in default browser
    在默认浏览器中打开 Pip-Boy 日志查看器

.DESCRIPTION
    Exports the latest log data, starts a local HTTP server, and opens the log viewer in the default browser.
    This is a convenient one-click solution to view voice notification logs.
    The HTTP server is required to avoid CORS issues when loading local JSON files.
    导出最新的日志数据，启动本地 HTTP 服务器，并在默认浏览器中打开日志查看器。
    这是一个方便的一键查看语音通知日志的解决方案。
    HTTP 服务器用于避免加载本地 JSON 文件时的 CORS 问题。

.PARAMETER SkipExport
    Skip data export and only open the viewer (use existing data)
    跳过数据导出，仅打开查看器（使用现有数据）

.PARAMETER Port
    Port number for the HTTP server (default: 8080)
    HTTP 服务器端口号（默认：8080）

.EXAMPLE
    .\Open-LogViewer.ps1
    Exports latest logs and opens viewer with HTTP server on port 8080
    导出最新日志并在端口 8080 上启动 HTTP 服务器打开查看器

.EXAMPLE
    .\Open-LogViewer.ps1 -SkipExport
    Opens viewer without re-exporting data
    打开查看器而不重新导出数据

.EXAMPLE
    .\Open-LogViewer.ps1 -Port 9090
    Opens viewer with HTTP server on port 9090
    在端口 9090 上启动 HTTP 服务器打开查看器

.NOTES
    Author: 壮爸
    Version: 2.0
    Last Modified: 2025-01-17
    Changes: Added HTTP server to avoid CORS issues
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$SkipExport,

    [Parameter(Mandatory = $false)]
    [int]$Port = 8080
)

try {
    Write-Information "=== Opening Pip-Boy Log Viewer ===" -InformationAction Continue

    # Get project root directory | 获取项目根目录
    $ProjectRoot = Split-Path -Path $PSScriptRoot -Parent | Split-Path -Parent | Split-Path -Parent
    $ViewerRootPath = Join-Path $ProjectRoot "viewers\log-viewer"
    $ViewerHtmlPath = Join-Path $ViewerRootPath "index.html"
    $ExportScriptPath = Join-Path $PSScriptRoot "Export-LogsData.ps1"

    # Check if viewer HTML exists | 检查查看器 HTML 是否存在
    if (-not (Test-Path -Path $ViewerHtmlPath)) {
        Write-Warning "Viewer HTML not found: $ViewerHtmlPath"
        Write-Information "`nThe log viewer frontend has not been implemented yet." -InformationAction Continue
        Write-Information "Please implement the frontend first (see: viewers/Pip-Boy查看器系统实施方案.md)" -InformationAction Continue
        Write-Information "`nYou can still export the log data by running:" -InformationAction Continue
        Write-Information "  .\scripts\viewers\log-viewers\Export-LogsData.ps1" -InformationAction Continue
        exit 1
    }

    # Export latest log data | 导出最新日志数据
    if (-not $SkipExport) {
        Write-Information "`n[1/3] Exporting latest log data..." -InformationAction Continue

        # Run export script | 运行导出脚本
        try {
            & $ExportScriptPath -ErrorAction Stop
        }
        catch {
            Write-Error "Data export failed: $_"
            exit 1
        }
    }
    else {
        Write-Information "`n[SKIP] Using existing log data" -InformationAction Continue
    }

    # Start HTTP server | 启动 HTTP 服务器
    Write-Information "`n[2/3] Starting local HTTP server on port $Port..." -InformationAction Continue

    # Create HTTP listener | 创建 HTTP 监听器
    $HttpListener = New-Object System.Net.HttpListener
    $HttpListener.Prefixes.Add("http://localhost:$Port/")

    try {
        $HttpListener.Start()
    }
    catch {
        Write-Error "Failed to start HTTP server on port ${Port}: $_"
        Write-Information "`nPlease try a different port using -Port parameter" -InformationAction Continue
        Write-Information "Example: .\Open-LogViewer.ps1 -Port 9090" -InformationAction Continue
        exit 1
    }

    Write-Information "✓ HTTP server started at http://localhost:$Port" -InformationAction Continue

    # Open viewer in default browser | 在默认浏览器中打开查看器
    Write-Information "`n[3/3] Opening viewer in browser..." -InformationAction Continue
    Start-Process "http://localhost:$Port/index.html"

    Write-Information "`n✓ Log viewer opened successfully!" -InformationAction Continue
    Write-Information "  URL: http://localhost:$Port/index.html" -InformationAction Continue
    Write-Information "`n=== Pip-Boy Log Viewer Ready ===" -InformationAction Continue
    Write-Information "`nPress Ctrl+C to stop the server and exit..." -InformationAction Continue
    Write-Information "The server will serve files from: $ViewerRootPath" -InformationAction Continue

    # Serve HTTP requests | 处理 HTTP 请求
    while ($HttpListener.IsListening) {
        try {
            # Wait for request | 等待请求
            $Context = $HttpListener.GetContext()
            $Request = $Context.Request
            $Response = $Context.Response

            # Get requested file path | 获取请求的文件路径
            $RequestedPath = $Request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($RequestedPath)) {
                $RequestedPath = "index.html"
            }

            $FilePath = Join-Path $ViewerRootPath $RequestedPath

            # Log request | 记录请求
            Write-Verbose "Request: $($Request.HttpMethod) $($Request.Url.LocalPath) -> $FilePath"

            # Check if file exists | 检查文件是否存在
            if (Test-Path -Path $FilePath -PathType Leaf) {
                # Read file content | 读取文件内容
                $FileBytes = [System.IO.File]::ReadAllBytes($FilePath)

                # Set content type based on file extension | 根据文件扩展名设置内容类型
                $Extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
                $ContentType = switch ($Extension) {
                    ".html" { "text/html; charset=utf-8" }
                    ".js" { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".css" { "text/css; charset=utf-8" }
                    ".png" { "image/png" }
                    ".jpg" { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".gif" { "image/gif" }
                    ".svg" { "image/svg+xml" }
                    default { "application/octet-stream" }
                }

                $Response.ContentType = $ContentType
                $Response.ContentLength64 = $FileBytes.Length
                $Response.StatusCode = 200
                $Response.OutputStream.Write($FileBytes, 0, $FileBytes.Length)
            }
            else {
                # File not found | 文件未找到
                $Response.StatusCode = 404
                $ErrorMessage = "404 - File Not Found: $RequestedPath"
                $ErrorBytes = [System.Text.Encoding]::UTF8.GetBytes($ErrorMessage)
                $Response.ContentLength64 = $ErrorBytes.Length
                $Response.OutputStream.Write($ErrorBytes, 0, $ErrorBytes.Length)
                Write-Warning "404 - File not found: $FilePath"
            }

            # Close response | 关闭响应
            $Response.Close()
        }
        catch {
            Write-Warning "Error handling request: $_"
            if ($Response) {
                $Response.Close()
            }
        }
    }
}
catch {
    Write-Error "Failed to open log viewer: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
finally {
    # Clean up HTTP listener | 清理 HTTP 监听器
    if ($HttpListener -and $HttpListener.IsListening) {
        Write-Information "`n=== Stopping HTTP server... ===" -InformationAction Continue
        $HttpListener.Stop()
        $HttpListener.Close()
        Write-Information "✓ HTTP server stopped" -InformationAction Continue
    }
}
