# ==============================================================================
# Script: Show-ErrorDashboard.ps1
# Purpose: 错误监控面板 - 可视化显示错误统计
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory = $false)]
    [switch]$Reset,

    [Parameter(Mandatory = $false)]
    [switch]$Raw
)

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"

# 强制设置 UTF-8 编码（解决中文对齐问题）
# 注意：必须在脚本开头设置，确保所有输出都使用正确编码
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8NoBom
[Console]::InputEncoding = $utf8NoBom
$global:OutputEncoding = $utf8NoBom

# ============== 加载模块 ==============
Import-Module (Join-Path $PSScriptRoot '..\modules\ErrorMonitor.psm1') -Force
Import-Module (Join-Path $PSScriptRoot '..\modules\StringAlignment.psm1') -Force

# ============== 辅助函数 ==============
function Get-HealthStatus {
    <#
    .SYNOPSIS
        Get health status based on error rate
        根据错误率获取健康状态

    .PARAMETER ErrorRate
        Error rate percentage
        错误率百分比

    .OUTPUTS
        Health status string
        健康状态字符串

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [double]$ErrorRate
    )

    if ($ErrorRate -eq 0) { return "Perfect" }
    elseif ($ErrorRate -lt 5) { return "Healthy" }
    elseif ($ErrorRate -lt 10) { return "Normal" }
    elseif ($ErrorRate -lt 20) { return "Warning" }
    else { return "Critical" }
}

function Get-ProgressBar {
    <#
    .SYNOPSIS
        Generate progress bar string
        生成进度条字符串

    .PARAMETER Percentage
        Percentage value (0-100)
        百分比值

    .PARAMETER Width
        Bar width in characters
        进度条宽度（字符数）

    .OUTPUTS
        Progress bar string
        进度条字符串

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [double]$Percentage,

        [Parameter(Mandatory = $false)]
        [int]$Width = 10
    )

    $filled = [Math]::Floor($Percentage / 100 * $Width)
    $empty = $Width - $filled

    $bar = "=" * $filled + "-" * $empty
    return "[$bar]"
}

function Show-Dashboard {
    <#
    .SYNOPSIS
        Display error monitoring dashboard
        显示错误监控面板

    .PARAMETER Stats
        Error statistics hashtable
        错误统计哈希表

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Stats
    )

    Clear-Host

    # Panel settings
    $panelWidth = 60
    $borderLine = "=" * $panelWidth

    # Top border with centered title
    Write-Host "+${borderLine}+" -ForegroundColor Cyan
    $title = "Error Monitoring Dashboard v1.0"
    Write-Host (New-BorderedLine $title $panelWidth -Alignment Center -BorderLeft "|" -BorderRight "|") -ForegroundColor Cyan
    Write-Host "+${borderLine}+" -ForegroundColor Cyan
    Write-Host (New-BorderedLine "" $panelWidth -BorderLeft "|" -BorderRight "|") -ForegroundColor Cyan

    # Overall statistics
    Write-Host (New-BorderedLine "  OVERALL STATISTICS" $panelWidth) -ForegroundColor Yellow

    $totalCalls = $Stats.Summary.TotalCalls
    $totalErrors = $Stats.Summary.TotalErrors
    $errorRate = $Stats.Summary.ErrorRate
    $healthStatus = Get-HealthStatus -ErrorRate $errorRate
    $progressBar = Get-ProgressBar -Percentage $errorRate

    # Total calls - aligned columns
    $line = "  Total Calls  : {0,4}" -f $totalCalls
    Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor White

    # Total errors - aligned columns
    $line = "  Total Errors : {0,4}" -f $totalErrors
    Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor White

    # Error rate - aligned columns with progress bar at column 31
    $rateText = "{0:F1}%" -f $errorRate
    $line = "  Error Rate   : {0,6}  {1}  {2,-8}" -f $rateText, $progressBar, $healthStatus
    Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor White

    Write-Host (New-BorderedLine "" $panelWidth) -ForegroundColor Cyan

    # Component health
    Write-Host (New-BorderedLine "  COMPONENT HEALTH" $panelWidth) -ForegroundColor Yellow

    foreach ($component in @("AI", "TTS", "Extract")) {
        $componentErrors = if ($Stats.ByComponent.$component) { $Stats.ByComponent.$component } else { 0 }
        $componentRate = if ($totalCalls -gt 0) { ($componentErrors / $totalCalls) * 100 } else { 0 }
        $componentBar = Get-ProgressBar -Percentage $componentRate

        $componentName = switch ($component) {
            "AI" { "AI Summary " }
            "TTS" { "TTS Audio " }
            "Extract" { "Msg Extract" }
            default { $component }
        }

        $componentColor = if ($componentRate -lt 5) { "Green" } elseif ($componentRate -lt 10) { "White" } else { "Yellow" }
        $status = if ($componentRate -lt 5) { "OK  " } elseif ($componentRate -lt 10) { "WARN" } else { "CRIT" }

        # Build complete line with aligned progress bar at column 31
        $errorsText = "{0} errors" -f $componentErrors
        $line = "  {0,-11} : {1,-10}  {2}  {3}" -f $componentName, $errorsText, $componentBar, $status

        Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor White
    }

    Write-Host (New-BorderedLine "" $panelWidth) -ForegroundColor Cyan

    # Error type distribution
    Write-Host (New-BorderedLine "  ERROR TYPE STATISTICS" $panelWidth) -ForegroundColor Yellow

    if ($Stats.ByType.Count -gt 0) {
        $sortedTypes = $Stats.ByType.GetEnumerator() | Sort-Object Value -Descending

        foreach ($errorType in $sortedTypes) {
            $typeName = $errorType.Key
            $count = $errorType.Value
            $line = "  {0}: {1,3} occurrences" -f $typeName, $count

            Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor White
        }
    }
    else {
        $line = "  No errors recorded"
        Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor Gray
    }

    Write-Host (New-BorderedLine "" $panelWidth) -ForegroundColor Cyan

    # Recent errors
    Write-Host (New-BorderedLine "  RECENT ERRORS (Last 5)" $panelWidth) -ForegroundColor Yellow

    if ($Stats.Timeline -and $Stats.Timeline.Count -gt 0) {
        $recentErrors = $Stats.Timeline | Select-Object -First 5

        foreach ($error in $recentErrors) {
            $time = $error.Time.Substring(11, 5)
            $component = $error.Component
            $type = $error.Type
            $msg = $error.Message

            $line = "  [{0}] {1}: {2} - {3}" -f $time, $component, $type, $msg

            Write-Host (New-BorderedLine $line $panelWidth -TruncateIfTooLong) -ForegroundColor Gray
        }
    }
    else {
        $line = "  No errors recorded"
        Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor Gray
    }

    Write-Host (New-BorderedLine "" $panelWidth) -ForegroundColor Cyan

    # Last update
    $line = "  Last Update: " + $Stats.Summary.LastUpdate
    Write-Host (New-BorderedLine $line $panelWidth) -ForegroundColor Gray

    # Bottom border
    Write-Host "+${borderLine}+" -ForegroundColor Cyan
    Write-Host ""
}

# ============== 主逻辑 ==============
try {
    # Handle reset request
    if ($Reset) {
        Write-Host "Are you sure you want to reset all error statistics? (Y/N): " -NoNewline -ForegroundColor Yellow
        $confirm = Read-Host
        if ($confirm -eq 'Y' -or $confirm -eq 'y') {
            Reset-ErrorStatistics -Force
            Write-Host "Error statistics have been reset" -ForegroundColor Green
        }
        else {
            Write-Host "Operation cancelled" -ForegroundColor Gray
        }
        exit 0
    }

    # Get error statistics
    $stats = Get-ErrorStatistics

    # Show raw data or dashboard
    if ($Raw) {
        $stats | ConvertTo-Json -Depth 10
    }
    else {
        Show-Dashboard -Stats $stats
    }

    # Operation hints
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  Refresh data: Re-run this script" -ForegroundColor Gray
    Write-Host "  Reset stats : Show-ErrorDashboard.ps1 -Reset" -ForegroundColor Gray
    Write-Host "  View raw    : Show-ErrorDashboard.ps1 -Raw" -ForegroundColor Gray
    Write-Host ""

}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}