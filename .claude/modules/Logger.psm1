# ==============================================================================
# Module: Logger.psm1
# Purpose: 统一日志管理模块 - Voice Notification Project
# Author: 壮爸
# Created: 2025-01-06
# ==============================================================================

<#
.SYNOPSIS
    统一日志管理模块，为所有脚本提供集中式日志功能
    Unified logging module for centralized logging across all scripts

.DESCRIPTION
    提供四个日志级别的写入函数：DEBUG、INFO、WARNING、ERROR
    支持自动日志轮转（超过10MB自动归档）
    使用Mutex确保多进程写入安全
    统一输出到 logs/voice-unified.log

.NOTES
    Author: 壮爸
    Encoding: UTF-8 with BOM
    Line Endings: CRLF
#>

function Write-VoiceLog
{
    <#
    .SYNOPSIS
        写入日志的核心函数
        Core function for writing log entries

    .PARAMETER Message
        日志消息内容
        Log message content

    .PARAMETER Level
        日志级别：DEBUG、INFO、WARNING、ERROR
        Log level: DEBUG, INFO, WARNING, ERROR

    .PARAMETER Source
        日志来源（自动获取调用者函数名）
        Log source (automatically gets caller function name)

    .PARAMETER LogPath
        日志文件路径（默认：logs/voice-unified.log）
        Log file path (default: logs/voice-unified.log)

    .EXAMPLE
        Write-VoiceLog -Message "任务开始" -Level INFO
        Write log entry with INFO level

    .NOTES
        此函数会自动处理日志轮转和线程安全
        This function handles log rotation and thread safety automatically
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $false)]
        [ValidateSet('DEBUG', 'INFO', 'WARNING', 'ERROR')]
        [string]$Level = 'INFO',

        [Parameter(Mandatory = $false)]
        [string]$Source = (Get-PSCallStack)[1].Command,

        [Parameter(Mandatory = $false)]
        [string]$LogPath = (Join-Path $PSScriptRoot '..\hooks\extensions\voice-summary\logs\voice-unified.log')
    )

    # 确保日志目录存在
    $logDir = Split-Path $LogPath -Parent
    if (!(Test-Path $logDir))
    {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    # 日志轮转检查（超过10MB创建新文件）
    if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 10MB))
    {
        $archivePath = $LogPath -replace '\.log$', "_$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
        try
        {
            Move-Item -Path $LogPath -Destination $archivePath -Force -ErrorAction Stop
        }
        catch
        {
            # 如果轮转失败，继续写入当前文件
            Write-Warning "日志轮转失败: $($_.Exception.Message)"
        }
    }

    # 构造日志条目
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $logEntry = "[$timestamp] [$Level] [$Source] $Message"

    # 线程安全写入（使用Mutex）
    $mutexName = "Global\VoiceNotificationLogMutex"
    $mutex = $null

    try
    {
        $mutex = New-Object System.Threading.Mutex($false, $mutexName)
        [void]$mutex.WaitOne()

        # UTF-8 without BOM（日志文件使用无BOM格式）
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::AppendAllText($LogPath, "$logEntry`n", $utf8NoBom)
    }
    catch
    {
        Write-Warning "日志写入失败: $($_.Exception.Message)"
    }
    finally
    {
        if ($null -ne $mutex)
        {
            $mutex.ReleaseMutex()
            $mutex.Dispose()
        }
    }

    # 同时输出到控制台（根据级别使用不同颜色）
    switch ($Level)
    {
        'DEBUG'
        {
            Write-Verbose $logEntry
        }
        'INFO'
        {
            Write-Host $logEntry -ForegroundColor Cyan
        }
        'WARNING'
        {
            Write-Warning $logEntry
        }
        'ERROR'
        {
            Write-Host $logEntry -ForegroundColor Red
        }
    }
}

function Write-VoiceDebug
{
    <#
    .SYNOPSIS
        写入 DEBUG 级别日志
        Write DEBUG level log

    .PARAMETER Message
        日志消息
        Log message

    .EXAMPLE
        Write-VoiceDebug "变量值: $变量"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-VoiceLog -Message $Message -Level DEBUG
}

function Write-VoiceInfo
{
    <#
    .SYNOPSIS
        写入 INFO 级别日志
        Write INFO level log

    .PARAMETER Message
        日志消息
        Log message

    .EXAMPLE
        Write-VoiceInfo "任务开始"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-VoiceLog -Message $Message -Level INFO
}

function Write-VoiceWarning
{
    <#
    .SYNOPSIS
        写入 WARNING 级别日志
        Write WARNING level log

    .PARAMETER Message
        日志消息
        Log message

    .EXAMPLE
        Write-VoiceWarning "API 超时，正在重试"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-VoiceLog -Message $Message -Level WARNING
}

function Write-VoiceError
{
    <#
    .SYNOPSIS
        写入 ERROR 级别日志
        Write ERROR level log

    .PARAMETER Message
        日志消息
        Log message

    .EXAMPLE
        Write-VoiceError "操作失败: $($_.Exception.Message)"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-VoiceLog -Message $Message -Level ERROR
}

# 导出模块函数
Export-ModuleMember -Function Write-VoiceLog, Write-VoiceDebug, Write-VoiceInfo, Write-VoiceWarning, Write-VoiceError
