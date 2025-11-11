# ==============================================================================
# Module: ErrorMonitor.psm1
# Purpose: 错误监控和统计模块
# Author: 壮爸
# Created: 2025-01-11
# Description: 收集、分类、统计系统运行中的错误，并提供数据持久化
# ==============================================================================

#Requires -Version 5.1

# ============== 模块变量 ==============
$script:ErrorDataPath = Join-Path $PSScriptRoot "..\data\error-stats.json"
$script:ErrorCache = @{
    Summary = @{
        TotalCalls = 0
        TotalErrors = 0
        ErrorRate = 0.0
        LastUpdate = ""
    }
    ByComponent = @{
        AI = 0
        TTS = 0
        Extract = 0
        Other = 0
    }
    ByType = @{}
    Timeline = @()
}

# ============== 初始化函数 ==============
function Initialize-ErrorMonitor {
    <#
    .SYNOPSIS
        Initialize error monitoring system
        初始化错误监控系统

    .DESCRIPTION
        Load existing error data or create new data structure
        加载现有错误数据或创建新的数据结构

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param()

    # 确保数据目录存在
    $dataDir = Split-Path $script:ErrorDataPath -Parent
    if (-not (Test-Path $dataDir)) {
        New-Item -Path $dataDir -ItemType Directory -Force | Out-Null
    }

    # 加载现有数据
    if (Test-Path $script:ErrorDataPath) {
        try {
            $jsonContent = Get-Content $script:ErrorDataPath -Raw -Encoding UTF8
            $script:ErrorCache = $jsonContent | ConvertFrom-Json -AsHashtable
            Write-Verbose "[ErrorMonitor] 已加载错误统计数据"
        }
        catch {
            Write-Warning "[ErrorMonitor] 无法加载错误数据，使用默认值"
        }
    }
    else {
        Write-Verbose "[ErrorMonitor] 初始化新的错误统计数据"
        Save-ErrorData
    }
}

# ============== 核心函数 ==============
function Record-Call {
    <#
    .SYNOPSIS
        Record a function call
        记录函数调用

    .PARAMETER Component
        Component name (AI/TTS/Extract/Other)
        组件名称

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("AI", "TTS", "Extract", "Other")]
        [string]$Component
    )

    $script:ErrorCache.Summary.TotalCalls++
    $script:ErrorCache.Summary.LastUpdate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # 每10次调用保存一次
    if ($script:ErrorCache.Summary.TotalCalls % 10 -eq 0) {
        Save-ErrorData
    }
}

function Record-Error {
    <#
    .SYNOPSIS
        Record an error occurrence
        记录错误发生

    .PARAMETER Component
        Component where error occurred
        发生错误的组件

    .PARAMETER ErrorType
        Type of error
        错误类型

    .PARAMETER ErrorMessage
        Detailed error message
        详细错误消息

    .PARAMETER ScriptName
        Name of the script where error occurred
        发生错误的脚本名称

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("AI", "TTS", "Extract", "Other")]
        [string]$Component,

        [Parameter(Mandatory = $true)]
        [string]$ErrorType,

        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage,

        [Parameter(Mandatory = $false)]
        [string]$ScriptName = ""
    )

    # 更新总体统计
    $script:ErrorCache.Summary.TotalErrors++
    $script:ErrorCache.Summary.LastUpdate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # 计算错误率
    if ($script:ErrorCache.Summary.TotalCalls -gt 0) {
        $script:ErrorCache.Summary.ErrorRate = [Math]::Round(
            ($script:ErrorCache.Summary.TotalErrors / $script:ErrorCache.Summary.TotalCalls) * 100,
            2
        )
    }

    # 更新组件统计
    if (-not $script:ErrorCache.ByComponent.ContainsKey($Component)) {
        $script:ErrorCache.ByComponent[$Component] = 0
    }
    $script:ErrorCache.ByComponent[$Component]++

    # 更新错误类型统计
    $simplifiedType = Get-SimplifiedErrorType -ErrorType $ErrorType
    if (-not $script:ErrorCache.ByType.ContainsKey($simplifiedType)) {
        $script:ErrorCache.ByType[$simplifiedType] = 0
    }
    $script:ErrorCache.ByType[$simplifiedType]++

    # 添加到时间线（保留最近100条）
    $errorRecord = @{
        Time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Component = $Component
        Type = $simplifiedType
        Message = $ErrorMessage.Substring(0, [Math]::Min(200, $ErrorMessage.Length))
        Script = $ScriptName
    }

    # 转换Timeline为数组（如果需要）
    if ($script:ErrorCache.Timeline -isnot [System.Collections.ArrayList]) {
        $script:ErrorCache.Timeline = [System.Collections.ArrayList]::new($script:ErrorCache.Timeline)
    }

    $script:ErrorCache.Timeline.Insert(0, $errorRecord)

    # 保持时间线在100条以内
    while ($script:ErrorCache.Timeline.Count -gt 100) {
        $script:ErrorCache.Timeline.RemoveAt($script:ErrorCache.Timeline.Count - 1)
    }

    # 立即保存错误数据
    Save-ErrorData
}

function Get-SimplifiedErrorType {
    <#
    .SYNOPSIS
        Simplify error type for categorization
        简化错误类型用于分类

    .PARAMETER ErrorType
        Original error type
        原始错误类型

    .OUTPUTS
        Simplified error type string
        简化的错误类型字符串

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ErrorType
    )

    # 根据关键词分类错误
    switch -Regex ($ErrorType.ToLower()) {
        "timeout|超时" { return "网络超时" }
        "not found|找不到|不存在" { return "文件不存在" }
        "connection|连接|服务|service" { return "服务未启动" }
        "access|权限|denied" { return "权限错误" }
        "encoding|编码|utf" { return "编码错误" }
        "api|接口" { return "API错误" }
        "memory|内存" { return "内存错误" }
        "format|格式|parse" { return "格式错误" }
        default { return "其他错误" }
    }
}

function Get-ErrorStatistics {
    <#
    .SYNOPSIS
        Get current error statistics
        获取当前错误统计

    .OUTPUTS
        Hashtable containing error statistics
        包含错误统计的哈希表

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param()

    # 确保数据是最新的
    if (Test-Path $script:ErrorDataPath) {
        try {
            $jsonContent = Get-Content $script:ErrorDataPath -Raw -Encoding UTF8
            $script:ErrorCache = $jsonContent | ConvertFrom-Json -AsHashtable
        }
        catch {
            Write-Warning "[ErrorMonitor] 读取错误数据失败"
        }
    }

    return $script:ErrorCache
}

function Reset-ErrorStatistics {
    <#
    .SYNOPSIS
        Reset all error statistics
        重置所有错误统计

    .PARAMETER Confirm
        Require confirmation before reset
        重置前需要确认

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $false)]
        [switch]$Force
    )

    if ($Force -or $PSCmdlet.ShouldProcess("错误统计数据", "重置")) {
        $script:ErrorCache = @{
            Summary = @{
                TotalCalls = 0
                TotalErrors = 0
                ErrorRate = 0.0
                LastUpdate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            ByComponent = @{
                AI = 0
                TTS = 0
                Extract = 0
                Other = 0
            }
            ByType = @{}
            Timeline = @()
        }

        Save-ErrorData
        Write-Information "[ErrorMonitor] 错误统计已重置" -InformationAction Continue
        return $true
    }

    return $false
}

function Save-ErrorData {
    <#
    .SYNOPSIS
        Save error data to JSON file
        保存错误数据到JSON文件

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param()

    try {
        $jsonContent = $script:ErrorCache | ConvertTo-Json -Depth 10 -Compress
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($script:ErrorDataPath, $jsonContent, $utf8NoBom)
        Write-Verbose "[ErrorMonitor] 错误数据已保存"
    }
    catch {
        Write-Warning "[ErrorMonitor] 保存错误数据失败: $_"
    }
}

# ============== 导出函数 ==============
Export-ModuleMember -Function @(
    'Initialize-ErrorMonitor',
    'Record-Call',
    'Record-Error',
    'Get-ErrorStatistics',
    'Reset-ErrorStatistics'
)

# 模块加载时初始化
Initialize-ErrorMonitor