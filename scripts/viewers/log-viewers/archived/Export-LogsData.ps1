<#
.SYNOPSIS
    Export voice notification logs to viewer JSON format
    导出语音通知日志到查看器 JSON 格式

.DESCRIPTION
    Reads the voice-unified.log file, parses session data, and exports to JSON format
    for the Pip-Boy log viewer. Each session includes user message, Claude reply,
    AI summary, voice settings, and execution status.
    读取 voice-unified.log 文件，解析会话数据，并导出为 Pip-Boy 日志查看器的 JSON 格式。
    每个会话包含用户消息、Claude 回复、AI 摘要、语音设置和执行状态。

.PARAMETER LogFilePath
    Path to the voice-unified.log file
    voice-unified.log 文件的路径

.PARAMETER OutputPath
    Path to output JSON file (default: viewers/logs/data/logs.json)
    输出 JSON 文件的路径（默认：viewers/logs/data/logs.json）

.EXAMPLE
    .\Export-LogsData.ps1
    Exports logs using default paths
    使用默认路径导出日志

.EXAMPLE
    .\Export-LogsData.ps1 -LogFilePath "custom.log" -OutputPath "output.json"
    Exports logs from custom path to custom output
    从自定义路径导出日志到自定义输出

.NOTES
    Author: 壮爸
    Version: 1.0
    Last Modified: 2025-01-16
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$LogFilePath,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath
)

# Set default paths relative to project root | 设置相对于项目根目录的默认路径
# Navigate up from scripts/viewers/log-viewers/ to project root
# 从 scripts/viewers/log-viewers/ 向上导航到项目根目录
$ProjectRoot = Split-Path -Path $PSScriptRoot -Parent  # -> scripts/viewers
$ProjectRoot = Split-Path -Path $ProjectRoot -Parent    # -> scripts
$ProjectRoot = Split-Path -Path $ProjectRoot -Parent    # -> project root
if (-not $LogFilePath) {
    $LogFilePath = Join-Path $ProjectRoot ".claude\hooks\extensions\voice-summary\logs\voice-unified.log"
}
if (-not $OutputPath) {
    $OutputPath = Join-Path $ProjectRoot "viewers\log-viewer\data\logs.json"
}

#region Helper Functions

function Parse-LogLine {
    <#
    .SYNOPSIS
        Parse a single log line into structured data
        将单行日志解析为结构化数据
    #>
    [CmdletBinding()]
    [OutputType([System.Collections.Specialized.OrderedDictionary])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Line
    )

    # Pattern: [timestamp] [level] [source] message
    # 模式：[时间戳] [级别] [来源] 消息
    $Pattern = '^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$'

    if ($Line -match $Pattern) {
        return [ordered]@{
            Timestamp = $Matches[1]
            Level     = $Matches[2]
            Source    = $Matches[3]
            Message   = $Matches[4]
        }
    }

    return $null
}

function Extract-SessionData {
    <#
    .SYNOPSIS
        Extract structured data from session log lines
        从会话日志行中提取结构化数据
    #>
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [array]$SessionLines
    )

    $Session = @{
        UserMessage  = ""
        ClaudeReply  = ""
        Summary      = ""
        Voice        = ""
        Model        = ""
        Status       = "Unknown"
        StartTime    = $null
        EndTime      = $null
    }

    foreach ($Line in $SessionLines) {
        # Skip empty lines | 跳过空行
        if ([string]::IsNullOrWhiteSpace($Line)) { continue }

        $Parsed = Parse-LogLine -Line $Line
        if (-not $Parsed) { continue }

        # Extract user message | 提取用户消息
        if ($Parsed.Message -match '^User message:\s*(.+)$') {
            $Session.UserMessage = $Matches[1].Trim()
        }

        # Extract Claude reply | 提取 Claude 回复
        if ($Parsed.Message -match '^Claude reply:\s*(.+)$') {
            $Session.ClaudeReply = $Matches[1].Trim()
        }

        # Extract final summary | 提取最终摘要
        if ($Parsed.Message -match '^FINAL SUMMARY:\s*(.+)$') {
            $Session.Summary = $Matches[1].Trim()
        }

        # Extract voice | 提取语音
        if ($Parsed.Message -match '^Voice:\s*(.+)$') {
            $Session.Voice = $Matches[1].Trim()
        }

        # Extract model | 提取模型
        if ($Parsed.Message -match '^Selected model:\s*(.+)$') {
            $Session.Model = $Matches[1].Trim()
        }

        # Extract playback result | 提取播放结果
        if ($Parsed.Message -match '^Playback result:\s*(.+)$') {
            $PlaybackResult = $Matches[1].Trim()
            $Session.Status = if ($PlaybackResult -eq "SUCCESS") { "Success" } else { "Error" }
        }

        # Track start time | 记录开始时间
        if ($Parsed.Message -match 'Voice Notification Started' -and -not $Session.StartTime) {
            $Session.StartTime = $Parsed.Timestamp
        }

        # Track end time | 记录结束时间
        if ($Parsed.Message -match 'Voice Notification Completed') {
            $Session.EndTime = $Parsed.Timestamp
        }
    }

    return $Session
}

function Convert-ToIso8601 {
    <#
    .SYNOPSIS
        Convert log timestamp to ISO 8601 format
        将日志时间戳转换为 ISO 8601 格式
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Timestamp
    )

    try {
        # Parse as local time (Beijing Time / UTC+8)
        # 解析为本地时间（北京时间 / UTC+8）
        $DateTime = [DateTime]::ParseExact($Timestamp, "yyyy-MM-dd HH:mm:ss.fff", $null)

        # Convert to UTC time for international standard compliance
        # 转换为 UTC 时间以符合国际标准
        return $DateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    catch {
        return $Timestamp
    }
}

function Calculate-Duration {
    <#
    .SYNOPSIS
        Calculate duration in seconds between two timestamps
        计算两个时间戳之间的时长（秒）
    #>
    [CmdletBinding()]
    [OutputType([double])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartTime,

        [Parameter(Mandatory = $true)]
        [string]$EndTime
    )

    try {
        $Start = [DateTime]::ParseExact($StartTime, "yyyy-MM-dd HH:mm:ss.fff", $null)
        $End = [DateTime]::ParseExact($EndTime, "yyyy-MM-dd HH:mm:ss.fff", $null)
        return [Math]::Round(($End - $Start).TotalSeconds, 2)
    }
    catch {
        return 0.0
    }
}

#endregion

#region Main Logic

try {
    Write-Verbose "=== Export Logs Data Started ==="

    # Resolve paths to absolute | 解析为绝对路径
    $LogFilePath = Resolve-Path -Path $LogFilePath -ErrorAction Stop
    Write-Verbose "Reading log file: $LogFilePath"

    # Read log file | 读取日志文件
    $LogLines = Get-Content -Path $LogFilePath -Encoding UTF8 -ErrorAction Stop
    Write-Verbose "Total log lines: $($LogLines.Count)"

    # Parse sessions | 解析会话
    $Sessions = @()
    $CurrentSession = @()
    $InSession = $false

    foreach ($Line in $LogLines) {
        if ($Line -match 'Voice Notification Started') {
            $InSession = $true
            $CurrentSession = @($Line)
        }
        elseif ($InSession) {
            $CurrentSession += $Line

            if ($Line -match 'Voice Notification Completed') {
                # Process completed session | 处理完成的会话
                $SessionData = Extract-SessionData -SessionLines $CurrentSession

                if ($SessionData.StartTime -and $SessionData.Summary) {
                    # Generate session ID | 生成会话 ID
                    $SessionId = ([DateTime]::ParseExact($SessionData.StartTime, "yyyy-MM-dd HH:mm:ss.fff", $null)).ToString("yyyyMMdd-HHmmss")

                    # Calculate duration | 计算时长
                    $Duration = if ($SessionData.EndTime) {
                        Calculate-Duration -StartTime $SessionData.StartTime -EndTime $SessionData.EndTime
                    } else {
                        0.0
                    }

                    # Create log item | 创建日志项
                    $LogItem = [ordered]@{
                        sessionId = $SessionId
                        timestamp = Convert-ToIso8601 -Timestamp $SessionData.StartTime
                        message   = $SessionData.Summary
                        duration  = $Duration
                        status    = $SessionData.Status
                        details   = [ordered]@{
                            userMessage  = $SessionData.UserMessage
                            claudeReply  = $SessionData.ClaudeReply
                            ollamaModel  = $SessionData.Model
                            voice        = $SessionData.Voice
                        }
                    }

                    $Sessions += $LogItem
                    Write-Verbose "Parsed session: $SessionId - $($SessionData.Summary)"
                }

                $InSession = $false
                $CurrentSession = @()
            }
        }
    }

    Write-Verbose "Total sessions parsed: $($Sessions.Count)"

    # Import conversion function | 导入转换函数
    $ConvertFunctionPath = Join-Path $PSScriptRoot "..\shared\ConvertTo-ViewerJson.ps1"
    . $ConvertFunctionPath

    # Convert to viewer JSON | 转换为查看器 JSON
    $OutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
    $Result = ConvertTo-ViewerJson -Items $Sessions -DataType "logs" -OutputPath $OutputPath

    if ($Result) {
        Write-Information "✓ Successfully exported $($Sessions.Count) sessions to: $OutputPath" -InformationAction Continue
    }
    else {
        Write-Error "Failed to export logs data"
        exit 1
    }

    Write-Verbose "=== Export Logs Data Completed ==="
}
catch {
    Write-Error "Export failed: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}

#endregion
