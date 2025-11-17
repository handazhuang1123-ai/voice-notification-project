<#
.SYNOPSIS
    Open the Pip-Boy log viewer in default browser
    在默认浏览器中打开 Pip-Boy 日志查看器

.DESCRIPTION
    Exports the latest log data and opens the log viewer HTML page in the default browser.
    This is a convenient one-click solution to view voice notification logs.
    导出最新的日志数据并在默认浏览器中打开日志查看器 HTML 页面。
    这是一个方便的一键查看语音通知日志的解决方案。

.PARAMETER SkipExport
    Skip data export and only open the viewer (use existing data)
    跳过数据导出，仅打开查看器（使用现有数据）

.EXAMPLE
    .\Open-LogViewer.ps1
    Exports latest logs and opens viewer
    导出最新日志并打开查看器

.EXAMPLE
    .\Open-LogViewer.ps1 -SkipExport
    Opens viewer without re-exporting data
    打开查看器而不重新导出数据

.NOTES
    Author: 壮爸
    Version: 1.0
    Last Modified: 2025-01-16
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$SkipExport
)

try {
    Write-Information "=== Opening Pip-Boy Log Viewer ===" -InformationAction Continue

    # Get project root directory | 获取项目根目录
    $ProjectRoot = Split-Path -Path $PSScriptRoot -Parent | Split-Path -Parent | Split-Path -Parent
    $ViewerHtmlPath = Join-Path $ProjectRoot "viewers\log-viewer\index.html"
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
        Write-Information "`n[1/2] Exporting latest log data..." -InformationAction Continue

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

    # Open viewer in default browser | 在默认浏览器中打开查看器
    Write-Information "`n[2/2] Opening viewer in browser..." -InformationAction Continue

    # Convert to absolute path | 转换为绝对路径
    $AbsoluteViewerPath = Resolve-Path -Path $ViewerHtmlPath

    # Open in default browser | 在默认浏览器中打开
    Start-Process $AbsoluteViewerPath

    Write-Information "`n✓ Log viewer opened successfully!" -InformationAction Continue
    Write-Information "  Location: $AbsoluteViewerPath" -InformationAction Continue

    Write-Information "`n=== Pip-Boy Log Viewer Ready ===" -InformationAction Continue
}
catch {
    Write-Error "Failed to open log viewer: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
