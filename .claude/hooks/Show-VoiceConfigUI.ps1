# ==============================================================================
# Script: Show-VoiceConfigUI.ps1
# Purpose: WPF 语音配置界面
# Author: 壮爸
# Created: 2025-01-07
# ==============================================================================

#Requires -Version 5.1

[CmdletBinding()]
param()

# ============== 编码配置 ==============
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 加载 WPF 程序集
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

function Show-VoiceConfigUI {
    <#
    .SYNOPSIS
        Display WPF voice configuration UI
        显示 WPF 语音配置界面

    .DESCRIPTION
        Load and display voice configuration dialog with live preview
        加载并显示语音配置对话框，支持实时预览
    #>

    # 加载 XAML
    $xamlPath = Join-Path $PSScriptRoot "VoiceConfigUI.xaml"
    if (!(Test-Path $xamlPath)) {
        Write-Error "XAML file not found: $xamlPath"
        return
    }

    try {
        $xaml = Get-Content $xamlPath -Raw -Encoding UTF8
        $reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml))
        $window = [Windows.Markup.XamlReader]::Load($reader)
        $reader.Close()

        if ($null -eq $window) {
            Write-Error "Failed to load XAML: window is null"
            return
        }
    } catch {
        Write-Error "Failed to load XAML: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        return
    }

    # 获取所有控件引用
    $voiceCombo = $window.FindName("VoiceComboBox")
    $useAutoDetectionCheckBox = $window.FindName("UseAutoDetectionCheckBox")
    $defaultEmotionCombo = $window.FindName("DefaultEmotionComboBox")
    $successEmotionCombo = $window.FindName("SuccessEmotionComboBox")
    $errorEmotionCombo = $window.FindName("ErrorEmotionComboBox")
    $warningEmotionCombo = $window.FindName("WarningEmotionComboBox")
    $questionEmotionCombo = $window.FindName("QuestionEmotionComboBox")
    $rateSlider = $window.FindName("RateSlider")
    $pitchSlider = $window.FindName("PitchSlider")
    $volumeSlider = $window.FindName("VolumeSlider")
    $styleDegreeSlider = $window.FindName("StyleDegreeSlider")
    $rateLabel = $window.FindName("RateLabel")
    $pitchLabel = $window.FindName("PitchLabel")
    $volumeLabel = $window.FindName("VolumeLabel")
    $styleDegreeLabel = $window.FindName("StyleDegreeLabel")
    $previewTextBox = $window.FindName("PreviewTextBox")
    $previewButton = $window.FindName("PreviewButton")
    $saveButton = $window.FindName("SaveButton")
    $cancelButton = $window.FindName("CancelButton")

    # 配置文件路径
    $configPath = Join-Path $PSScriptRoot "voice-config.json"

    # 加载现有配置
    $config = @{
        Voice = "zh-CN-XiaoxiaoNeural"
        Rate = -8
        Pitch = 1
        Volume = 85
        StyleDegree = 1.2
        UseSSML = $true
        EmotionSettings = @{
            UseAutoDetection = $true
            DefaultEmotion = "assistant"
            AutoMapping = @{
                Success = "cheerful"
                Error = "calm"
                Warning = "serious"
                Question = "gentle"
            }
        }
    }

    if (Test-Path $configPath) {
        try {
            $savedConfig = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $config.Voice = $savedConfig.Voice
            $config.Rate = $savedConfig.Rate
            $config.Pitch = $savedConfig.Pitch
            $config.Volume = $savedConfig.Volume
            $config.StyleDegree = $savedConfig.StyleDegree
            $config.UseSSML = $savedConfig.UseSSML
            $config.EmotionSettings.UseAutoDetection = $savedConfig.EmotionSettings.UseAutoDetection
            $config.EmotionSettings.DefaultEmotion = $savedConfig.EmotionSettings.DefaultEmotion
            $config.EmotionSettings.AutoMapping.Success = $savedConfig.EmotionSettings.AutoMapping.Success
            $config.EmotionSettings.AutoMapping.Error = $savedConfig.EmotionSettings.AutoMapping.Error
            $config.EmotionSettings.AutoMapping.Warning = $savedConfig.EmotionSettings.AutoMapping.Warning
            $config.EmotionSettings.AutoMapping.Question = $savedConfig.EmotionSettings.AutoMapping.Question
        } catch {
            Write-Warning "Failed to load config: $_"
        }
    }

    # 应用配置到界面
    foreach ($item in $voiceCombo.Items) {
        if ($item.Tag -eq $config.Voice) {
            $voiceCombo.SelectedItem = $item
            break
        }
    }

    $useAutoDetectionCheckBox.IsChecked = $config.EmotionSettings.UseAutoDetection

    foreach ($item in $defaultEmotionCombo.Items) {
        if ($item.Tag -eq $config.EmotionSettings.DefaultEmotion) {
            $defaultEmotionCombo.SelectedItem = $item
            break
        }
    }

    foreach ($item in $successEmotionCombo.Items) {
        if ($item.Tag -eq $config.EmotionSettings.AutoMapping.Success) {
            $successEmotionCombo.SelectedItem = $item
            break
        }
    }

    foreach ($item in $errorEmotionCombo.Items) {
        if ($item.Tag -eq $config.EmotionSettings.AutoMapping.Error) {
            $errorEmotionCombo.SelectedItem = $item
            break
        }
    }

    foreach ($item in $warningEmotionCombo.Items) {
        if ($item.Tag -eq $config.EmotionSettings.AutoMapping.Warning) {
            $warningEmotionCombo.SelectedItem = $item
            break
        }
    }

    foreach ($item in $questionEmotionCombo.Items) {
        if ($item.Tag -eq $config.EmotionSettings.AutoMapping.Question) {
            $questionEmotionCombo.SelectedItem = $item
            break
        }
    }

    $rateSlider.Value = $config.Rate
    $pitchSlider.Value = $config.Pitch
    $volumeSlider.Value = $config.Volume
    $styleDegreeSlider.Value = $config.StyleDegree

    # 滑块事件
    $rateSlider.Add_ValueChanged({
        $value = [math]::Round($rateSlider.Value)
        $sign = if ($value -ge 0) { "+" } else { "" }
        $rateLabel.Text = "语速: $sign$value%"
    })

    $pitchSlider.Add_ValueChanged({
        $value = [math]::Round($pitchSlider.Value)
        $sign = if ($value -ge 0) { "+" } else { "" }
        $pitchLabel.Text = "音调: $sign${value}st"
    })

    $volumeSlider.Add_ValueChanged({
        $value = [math]::Round($volumeSlider.Value)
        $volumeLabel.Text = "音量: $value%"
    })

    $styleDegreeSlider.Add_ValueChanged({
        $value = [math]::Round($styleDegreeSlider.Value, 1)
        $styleDegreeLabel.Text = "情感强度: $value"
    })

    # 全局变量：当前播放进程
    $script:currentPlaybackProcess = $null

    # 试听按钮
    $previewButton.Add_Click({
        # 如果正在播放，点击停止
        if ($script:currentPlaybackProcess -and -not $script:currentPlaybackProcess.HasExited) {
            try {
                $script:currentPlaybackProcess.Kill()
                $script:currentPlaybackProcess = $null
            } catch {}
            $previewButton.Content = "🔊 试听语音"
            return
        }

        $voice = $voiceCombo.SelectedItem.Tag
        $useAutoDetection = $useAutoDetectionCheckBox.IsChecked
        $defaultEmotion = $defaultEmotionCombo.SelectedItem.Tag
        $successEmotion = $successEmotionCombo.SelectedItem.Tag
        $errorEmotion = $errorEmotionCombo.SelectedItem.Tag
        $warningEmotion = $warningEmotionCombo.SelectedItem.Tag
        $questionEmotion = $questionEmotionCombo.SelectedItem.Tag
        $rate = [math]::Round($rateSlider.Value)
        $pitch = [math]::Round($pitchSlider.Value)
        $volume = [math]::Round($volumeSlider.Value)
        $styleDegree = [math]::Round($styleDegreeSlider.Value, 1)
        $text = $previewTextBox.Text

        $previewButton.Content = "⏹ 停止播放"

        try {
            $playScript = Join-Path $PSScriptRoot "Play-EdgeTTS.ps1"

            # 临时修改配置文件进行预览
            $tempConfig = @{
                Voice = $voice
                Rate = $rate
                Pitch = $pitch
                Volume = $volume
                StyleDegree = $styleDegree
                UseSSML = $true
                EmotionSettings = @{
                    UseAutoDetection = $useAutoDetection
                    DefaultEmotion = $defaultEmotion
                    AutoMapping = @{
                        Success = $successEmotion
                        Error = $errorEmotion
                        Warning = $warningEmotion
                        Question = $questionEmotion
                    }
                }
            }

            $tempConfigPath = Join-Path $env:TEMP "voice-config-preview.json"
            $tempConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempConfigPath -Encoding UTF8

            # 备份原配置
            Copy-Item $configPath "$configPath.bak" -Force -ErrorAction SilentlyContinue

            # 使用临时配置
            Copy-Item $tempConfigPath $configPath -Force

            # 在后台进程中播放
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "powershell"
            $psi.Arguments = "-ExecutionPolicy Bypass -NoProfile -Command `"& '$playScript' -Text '$text' -Voice '$voice'`""
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true

            $script:currentPlaybackProcess = [System.Diagnostics.Process]::Start($psi)

            # 使用定时器监控进程
            $timer = New-Object System.Windows.Threading.DispatcherTimer
            $timer.Interval = [TimeSpan]::FromMilliseconds(500)
            $timer.Add_Tick({
                if ($script:currentPlaybackProcess.HasExited) {
                    $timer.Stop()

                    # 恢复原配置
                    if (Test-Path "$configPath.bak") {
                        Move-Item "$configPath.bak" $configPath -Force -ErrorAction SilentlyContinue
                    }

                    $script:currentPlaybackProcess = $null
                    $previewButton.Content = "✓ 播放完成"

                    # 1秒后恢复按钮
                    $resetTimer = New-Object System.Windows.Threading.DispatcherTimer
                    $resetTimer.Interval = [TimeSpan]::FromSeconds(1)
                    $resetTimer.Add_Tick({
                        $resetTimer.Stop()
                        $previewButton.Content = "🔊 试听语音"
                    })
                    $resetTimer.Start()
                }
            })
            $timer.Start()

        } catch {
            [System.Windows.MessageBox]::Show("预览失败: $_", "错误", "OK", "Error")
            $previewButton.Content = "🔊 试听语音"
            # 恢复原配置
            if (Test-Path "$configPath.bak") {
                Move-Item "$configPath.bak" $configPath -Force -ErrorAction SilentlyContinue
            }
        }
    })

    # 保存按钮
    $saveButton.Add_Click({
        $config.Voice = $voiceCombo.SelectedItem.Tag
        $config.Rate = [math]::Round($rateSlider.Value)
        $config.Pitch = [math]::Round($pitchSlider.Value)
        $config.Volume = [math]::Round($volumeSlider.Value)
        $config.StyleDegree = [math]::Round($styleDegreeSlider.Value, 1)
        $config.EmotionSettings.UseAutoDetection = $useAutoDetectionCheckBox.IsChecked
        $config.EmotionSettings.DefaultEmotion = $defaultEmotionCombo.SelectedItem.Tag
        $config.EmotionSettings.AutoMapping.Success = $successEmotionCombo.SelectedItem.Tag
        $config.EmotionSettings.AutoMapping.Error = $errorEmotionCombo.SelectedItem.Tag
        $config.EmotionSettings.AutoMapping.Warning = $warningEmotionCombo.SelectedItem.Tag
        $config.EmotionSettings.AutoMapping.Question = $questionEmotionCombo.SelectedItem.Tag

        try {
            $config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8
            [System.Windows.MessageBox]::Show("配置已保存！", "成功", "OK", "Information")
            $window.Close()
        } catch {
            [System.Windows.MessageBox]::Show("保存失败: $_", "错误", "OK", "Error")
        }
    })

    # 取消按钮
    $cancelButton.Add_Click({
        $window.Close()
    })

    # 窗口关闭事件：清理播放进程
    $window.Add_Closed({
        if ($script:currentPlaybackProcess -and -not $script:currentPlaybackProcess.HasExited) {
            try {
                $script:currentPlaybackProcess.Kill()
            } catch {}
        }
    })

    # 显示窗口
    $null = $window.ShowDialog()
}

# 运行界面
Show-VoiceConfigUI
