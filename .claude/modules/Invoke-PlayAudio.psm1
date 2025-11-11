# ==============================================================================
# Module: Invoke-PlayAudio.psm1
# Purpose: 通用音频播放模块 - 支持 MP3/WAV 格式
# Author: 壮爸
# Created: 2025-01-09
# Version: 1.0
# ==============================================================================

#Requires -Version 5.1

function Invoke-PlayAudio {
    <#
    .SYNOPSIS
        Play audio file using best available method (supports MP3/WAV)
        使用最佳可用方法播放音频文件 (支持 MP3/WAV)

    .DESCRIPTION
        Plays audio files with automatic fallback across multiple playback methods:
        1. Windows Media Player COM (WMPlayer.OCX) - Primary method
        2. WPF MediaPlayer - Fallback method
        3. System default player - Last resort

        Supports MP3, WAV, WMA and other common audio formats.

        使用优雅降级策略播放音频:
        1. Windows Media Player COM 对象 (WMPlayer.OCX) - 首选
        2. WPF MediaPlayer - 备选
        3. 系统默认播放器 - 保底

        支持 MP3, WAV, WMA 等常见音频格式。

    .PARAMETER AudioPath
        Path to audio file
        音频文件路径

    .PARAMETER Volume
        Volume level (0-100, default: 100)
        音量级别 (0-100, 默认: 100)

    .PARAMETER TimeoutSeconds
        Playback timeout in seconds (default: 60)
        播放超时时间(秒) (默认: 60)

    .EXAMPLE
        Invoke-PlayAudio -AudioPath "notification.mp3"
        Play MP3 file at full volume
        以最大音量播放 MP3 文件

    .EXAMPLE
        Invoke-PlayAudio -AudioPath "voice.wav" -Volume 80 -TimeoutSeconds 30
        Play WAV file at 80% volume with 30s timeout
        以 80% 音量播放 WAV 文件,30秒超时

    .NOTES
        Author: 壮爸
        Version: 1.0
        Requires: Windows OS
        需要: Windows 操作系统

        优化依据: docs/PowerShell-MP3播放解决方案调研报告.md
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [ValidateScript({
                if (-not (Test-Path $_)) {
                    throw "音频文件不存在: $_"
                }
                $true
            })]
        [string]$AudioPath,

        [Parameter(Mandatory = $false)]
        [ValidateRange(0, 100)]
        [int]$Volume = 100,

        [Parameter(Mandatory = $false)]
        [ValidateRange(1, 600)]
        [int]$TimeoutSeconds = 60
    )

    # 获取绝对路径
    $AudioPath = Resolve-Path $AudioPath

    Write-Verbose "播放音频: $AudioPath"
    Write-Verbose "音量: $Volume%, 超时: $TimeoutSeconds 秒"

    # 方法 1: Windows Media Player COM 对象 (推荐)
    try {
        Write-Verbose "尝试使用 Windows Media Player COM..."

        $wmp = New-Object -ComObject "WMPlayer.OCX" -ErrorAction Stop
        $wmp.settings.volume = $Volume
        $wmp.URL = $AudioPath

        # 等待文件加载
        $loadTimeout = 5
        $loadWaited = 0
        while ($wmp.currentMedia.duration -eq 0 -and $loadWaited -lt $loadTimeout) {
            Start-Sleep -Milliseconds 100
            $loadWaited += 0.1
        }

        if ($wmp.currentMedia.duration -eq 0) {
            throw "文件加载超时"
        }

        Write-Verbose "文件时长: $($wmp.currentMedia.duration) 秒"

        $wmp.controls.play()

        # 等待播放完成 (PlayState: 1=Stopped, 2=Paused, 3=Playing)
        $playWaited = 0
        while ($wmp.playState -ne 1 -and $playWaited -lt $TimeoutSeconds) {
            Start-Sleep -Milliseconds 100
            $playWaited += 0.1
        }

        $wmp.controls.stop()
        $wmp.close()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wmp) | Out-Null

        Write-Verbose "播放完成 (WMPlayer)"
        return @{ Success = $true; Method = "WMPlayer" }

    } catch {
        Write-Verbose "WMPlayer 失败: $($_.Exception.Message)"
    }

    # 方法 2: WPF MediaPlayer (备选)
    try {
        Write-Verbose "尝试使用 WPF MediaPlayer..."

        Add-Type -AssemblyName PresentationCore -ErrorAction Stop

        $mediaPlayer = New-Object System.Windows.Media.MediaPlayer
        $mediaPlayer.Volume = $Volume / 100.0  # 转换为 0.0-1.0
        $mediaPlayer.Open([uri]$AudioPath)

        # 等待加载
        Start-Sleep -Milliseconds 500

        # 获取时长
        $duration = 0
        if ($mediaPlayer.NaturalDuration.HasTimeSpan) {
            $duration = $mediaPlayer.NaturalDuration.TimeSpan.TotalSeconds
        } else {
            # 如果无法获取时长,使用默认值
            $duration = 10
        }

        Write-Verbose "文件时长: $duration 秒 (估计)"

        $mediaPlayer.Play()

        # 等待播放完成
        $waitTime = [Math]::Min($duration + 1, $TimeoutSeconds)
        Start-Sleep -Seconds $waitTime

        $mediaPlayer.Stop()
        $mediaPlayer.Close()

        Write-Verbose "播放完成 (MediaPlayer)"
        return @{ Success = $true; Method = "MediaPlayer" }

    } catch {
        Write-Verbose "MediaPlayer 失败: $($_.Exception.Message)"
    }

    # 方法 3: 系统默认播放器 (保底)
    try {
        Write-Verbose "使用系统默认播放器..."

        Start-Process -FilePath $AudioPath -Wait -ErrorAction Stop

        Write-Verbose "播放完成 (默认播放器)"
        return @{ Success = $true; Method = "DefaultPlayer" }

    } catch {
        Write-Error "所有播放方法均失败: $($_.Exception.Message)"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# 导出函数
Export-ModuleMember -Function Invoke-PlayAudio
