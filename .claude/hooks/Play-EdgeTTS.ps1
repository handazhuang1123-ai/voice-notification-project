# ==============================================================================
# Script: Play-EdgeTTS.ps1
# Purpose: Edge-TTS 语音播放模块 - 支持 SSML 和情感表达
# Author: 壮爸
# Refactored: 2025-01-07 (v2.0 - 添加 SSML 支持)
# ==============================================================================

#Requires -Version 5.1

param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [Parameter(Mandatory = $false)]
    [string]$Voice = "zh-CN-XiaoxiaoNeural",

    [Parameter(Mandatory = $false)]
    [string]$EmotionStyle = "",

    [Parameter(Mandatory = $false)]
    [int]$TimeoutSeconds = 30
)

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 导入模块 ==============
Import-Module (Join-Path $PSScriptRoot '..\modules\Logger.psm1') -Force

# 导入 SSML 生成模块
$ssmlModulePath = Join-Path $PSScriptRoot 'New-SSML.ps1'
if (Test-Path $ssmlModulePath) {
    . $ssmlModulePath
}

# ============== 辅助函数 ==============
function Get-EdgeTTSCommand {
    <#
    .SYNOPSIS
        Get the correct edge-tts command path
        获取正确的 edge-tts 命令路径

    .DESCRIPTION
        Returns the Node.js version of edge-tts command
        返回 Node.js 版本的 edge-tts 命令

    .OUTPUTS
        String path to edge-tts command or empty string if not found
        返回 edge-tts 命令路径，如果未找到则返回空字符串
    #>
    # 优先使用 Node.js 版本的 edge-tts
    $nodeEdgeTts = Join-Path $env:APPDATA "npm\edge-tts.cmd"
    if (Test-Path $nodeEdgeTts) {
        return $nodeEdgeTts
    }

    # 尝试从 PATH 获取
    try {
        $cmd = Get-Command edge-tts -ErrorAction Stop
        return $cmd.Source
    } catch {
        return ""
    }
}

function Invoke-EdgeTTSWithSSML {
    <#
    .SYNOPSIS
        Call Node.js edge-tts with SSML support
        使用 SSML 支持调用 Node.js edge-tts

    .PARAMETER SSMLContent
        SSML XML content
        SSML XML 内容

    .PARAMETER OutputPath
        Output audio file path
        输出音频文件路径

    .PARAMETER EdgeTTSCommand
        Path to edge-tts command
        edge-tts 命令路径

    .OUTPUTS
        Hashtable with Success and Error keys
        返回包含 Success 和 Error 键的哈希表
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$SSMLContent,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath,

        [Parameter(Mandatory = $true)]
        [string]$EdgeTTSCommand
    )

    # 创建临时 SSML 文件
    $ssmlFilePath = Join-Path $env:TEMP "voice-notification-$(Get-Random).xml"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($ssmlFilePath, $SSMLContent, $utf8NoBom)

    Write-VoiceDebug "SSML file created: $ssmlFilePath"

    try {
        # 调用 Node.js edge-tts 处理 SSML
        # 使用 @andresaya/edge-tts 的命令格式: edge-tts synthesize -f file --ssml -o output
        # 注意：-o 参数不需要文件扩展名
        $outputWithoutExt = $OutputPath -replace '\.mp3$', ''

        $argumentList = @(
            "synthesize",
            "-f", $ssmlFilePath,
            "--ssml",
            "-o", $outputWithoutExt
        )

        $edgeTtsProcess = Start-Process -FilePath $EdgeTTSCommand `
            -ArgumentList $argumentList `
            -NoNewWindow -PassThru -Wait `
            -RedirectStandardError (Join-Path $env:TEMP "edge-tts-error-$(Get-Random).txt")

        if ($edgeTtsProcess.ExitCode -ne 0) {
            Write-VoiceError "edge-tts failed with exit code $($edgeTtsProcess.ExitCode)"
            return @{ Success = $false; Error = "edge-tts SSML processing failed" }
        }

        # 等待文件写入完成
        Start-Sleep -Milliseconds 300

        if (!(Test-Path $OutputPath)) {
            Write-VoiceError "Audio file not generated"
            return @{ Success = $false; Error = "Audio file not found" }
        }

        $fileSize = (Get-Item $OutputPath).Length
        Write-VoiceDebug "Audio file generated: $fileSize bytes"

        return @{ Success = $true }

    } catch {
        Write-VoiceError "Exception in SSML processing: $($_.Exception.Message)"
        return @{ Success = $false; Error = $_.Exception.Message }
    } finally {
        # 清理 SSML 文件
        Remove-Item $ssmlFilePath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-EdgeTTSPlainText {
    <#
    .SYNOPSIS
        Call edge-tts with plain text (legacy mode)
        使用纯文本调用 edge-tts（传统模式）

    .PARAMETER Text
        Text to convert to speech
        要转换为语音的文本

    .PARAMETER Voice
        Voice name
        语音名称

    .PARAMETER OutputPath
        Output audio file path
        输出音频文件路径

    .PARAMETER EdgeTTSCommand
        Path to edge-tts command
        edge-tts 命令路径

    .OUTPUTS
        Hashtable with Success and Error keys
        返回包含 Success 和 Error 键的哈希表
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$Voice,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath,

        [Parameter(Mandatory = $true)]
        [string]$EdgeTTSCommand
    )

    # 创建临时文本文件以避免编码问题
    $textFilePath = Join-Path $env:TEMP "voice-notification-text-$(Get-Random).txt"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($textFilePath, $Text, $utf8NoBom)
    Write-VoiceDebug "Text file created: $textFilePath"

    try {
        # 使用 @andresaya/edge-tts 的命令格式: edge-tts synthesize -f file -v voice -o output
        # 注意：Node.js 版本不支持 --rate/--pitch 参数，需要使用 SSML
        # 注意：-o 参数不需要文件扩展名
        $outputWithoutExt = $OutputPath -replace '\.mp3$', ''

        $argumentList = @(
            "synthesize",
            "-f", $textFilePath,
            "-v", $Voice,
            "-o", $outputWithoutExt
        )

        $edgeTtsProcess = Start-Process -FilePath $EdgeTTSCommand `
            -ArgumentList $argumentList `
            -NoNewWindow -PassThru -Wait

        if ($edgeTtsProcess.ExitCode -ne 0) {
            Write-VoiceError "edge-tts failed with exit code $($edgeTtsProcess.ExitCode)"
            return @{ Success = $false; Error = "edge-tts generation failed" }
        }

        # 等待文件写入完成
        Start-Sleep -Milliseconds 200

        if (!(Test-Path $OutputPath)) {
            Write-VoiceError "Audio file not generated"
            return @{ Success = $false; Error = "Audio file not found" }
        }

        $fileSize = (Get-Item $OutputPath).Length
        Write-VoiceDebug "Audio file generated: $fileSize bytes"

        return @{ Success = $true }

    } catch {
        Write-VoiceError "Exception in plain text processing: $($_.Exception.Message)"
        return @{ Success = $false; Error = $_.Exception.Message }
    } finally {
        Remove-Item $textFilePath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-AudioPlayback {
    <#
    .SYNOPSIS
        Play audio file using Windows Media Player
        使用 Windows Media Player 播放音频文件

    .PARAMETER AudioPath
        Path to audio file
        音频文件路径

    .PARAMETER TimeoutSeconds
        Playback timeout in seconds
        播放超时时间（秒）

    .OUTPUTS
        Hashtable with Success and Result keys
        返回包含 Success 和 Result 键的哈希表
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$AudioPath,

        [Parameter(Mandatory = $false)]
        [int]$TimeoutSeconds = 30
    )

    Write-VoiceDebug "Starting playback..."
    $jobScript = {
        param($audioPath)
        try {
            $player = New-Object -ComObject WMPlayer.OCX
            $player.settings.volume = 100
            $player.URL = $audioPath
            $player.controls.play()

            # 等待播放完成
            $maxWait = 60
            $waited = 0
            while ($player.playState -ne 1 -and $waited -lt $maxWait) {
                Start-Sleep -Milliseconds 500
                $waited += 0.5
            }

            $player.controls.stop()
            $player.close()
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($player) | Out-Null
            return "SUCCESS"
        } catch {
            return "ERROR: $($_.Exception.Message)"
        }
    }

    $job = Start-Job -ScriptBlock $jobScript -ArgumentList $AudioPath
    Wait-Job -Job $job -Timeout $TimeoutSeconds | Out-Null
    $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

    Write-VoiceDebug "Playback result: $result"

    if ($result -like "SUCCESS") {
        return @{ Success = $true; Result = $result }
    } else {
        return @{ Success = $false; Error = $result }
    }
}

# ============== 主逻辑 ==============
try {
    Write-VoiceInfo "=== Edge-TTS Playback Started (v2.0 - SSML) ==="
    Write-VoiceDebug "Text: $Text"
    Write-VoiceDebug "Voice: $Voice"
    Write-VoiceDebug "Emotion Style: $EmotionStyle"

    # 获取 edge-tts 命令路径
    $edgeTtsCmd = Get-EdgeTTSCommand
    if ([string]::IsNullOrEmpty($edgeTtsCmd)) {
        Write-VoiceError "edge-tts command not found"
        return @{ Success = $false; Error = "edge-tts not installed" }
    }
    Write-VoiceDebug "Using edge-tts: $edgeTtsCmd"

    # 生成临时音频文件路径
    $tempPath = Join-Path $env:TEMP "voice-notification-$(Get-Random).mp3"
    Write-VoiceDebug "Temp file: $tempPath"

    # 根据是否指定情感风格决定使用 SSML 还是纯文本模式
    if ($EmotionStyle -and (Get-Command ConvertTo-SSML -ErrorAction SilentlyContinue)) {
        Write-VoiceInfo "Using SSML mode with emotion style: $EmotionStyle"

        # 读取配置文件（如果存在）
        $configPath = Join-Path $PSScriptRoot "voice-config.json"
        $config = @{
            Rate = "-8%"
            Pitch = "+1st"
            Volume = "85%"
            StyleDegree = 1.2
        }

        if (Test-Path $configPath) {
            try {
                $savedConfig = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
                $config.Rate = if ($savedConfig.Rate -lt 0) { "$($savedConfig.Rate)%" } else { "+$($savedConfig.Rate)%" }
                $config.Pitch = if ($savedConfig.Pitch -lt 0) { "$($savedConfig.Pitch)st" } else { "+$($savedConfig.Pitch)st" }
                $config.Volume = "$($savedConfig.Volume)%"
                $config.StyleDegree = [double]$savedConfig.StyleDegree
                Write-VoiceDebug "Loaded config: Rate=$($config.Rate), Pitch=$($config.Pitch), Volume=$($config.Volume)"
            } catch {
                Write-VoiceWarning "Failed to load config, using defaults: $_"
            }
        }

        # 生成 SSML
        $ssml = ConvertTo-SSML -Text $Text `
            -Voice $Voice `
            -Style $EmotionStyle `
            -StyleDegree $config.StyleDegree `
            -Rate $config.Rate `
            -Pitch $config.Pitch `
            -Volume $config.Volume

        Write-VoiceDebug "SSML generated (length: $($ssml.Length) chars)"

        # 使用 SSML 生成音频
        $genResult = Invoke-EdgeTTSWithSSML -SSMLContent $ssml -OutputPath $tempPath -EdgeTTSCommand $edgeTtsCmd

    } else {
        Write-VoiceInfo "Using plain text mode (legacy)"

        # 使用纯文本模式（向后兼容）
        $genResult = Invoke-EdgeTTSPlainText -Text $Text -Voice $Voice -OutputPath $tempPath -EdgeTTSCommand $edgeTtsCmd
    }

    # 检查音频生成结果
    if (-not $genResult.Success) {
        Write-VoiceError "Audio generation failed: $($genResult.Error)"
        return $genResult
    }

    # 播放音频
    $playResult = Invoke-AudioPlayback -AudioPath $tempPath -TimeoutSeconds $TimeoutSeconds

    # 清理临时文件
    Start-Sleep -Milliseconds 500
    Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    Write-VoiceDebug "Temp files cleaned up"

    Write-VoiceInfo "=== Edge-TTS Playback Completed ==="
    return $playResult

} catch {
    Write-VoiceError "FATAL ERROR: $($_.Exception.Message)"
    return @{ Success = $false; Error = $_.Exception.Message }
}
