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
        # ✅ 使用 script 作用域避免闭包问题
        $script:window = [Windows.Markup.XamlReader]::Load($reader)
        $reader.Close()

        if ($null -eq $script:window) {
            Write-Error "Failed to load XAML: window is null"
            return
        }
    } catch {
        Write-Error "Failed to load XAML: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        return
    }

    # ✅ 预存所有控件引用到 script 作用域（避免闭包失效问题）
    $script:voiceCombo = $script:window.FindName("VoiceComboBox")
    $script:useAutoDetectionCheckBox = $script:window.FindName("UseAutoDetectionCheckBox")
    $script:defaultEmotionCombo = $script:window.FindName("DefaultEmotionComboBox")
    $script:successEmotionCombo = $script:window.FindName("SuccessEmotionComboBox")
    $script:errorEmotionCombo = $script:window.FindName("ErrorEmotionComboBox")
    $script:warningEmotionCombo = $script:window.FindName("WarningEmotionComboBox")
    $script:questionEmotionCombo = $script:window.FindName("QuestionEmotionComboBox")
    $script:robotEffectCombo = $script:window.FindName("RobotEffectComboBox")

    # 验证关键控件是否成功加载
    if ($null -eq $script:robotEffectCombo) {
        Write-Warning "RobotEffectComboBox not found in XAML"
    }

    $script:rateSlider = $script:window.FindName("RateSlider")
    $script:pitchSlider = $script:window.FindName("PitchSlider")
    $script:volumeSlider = $script:window.FindName("VolumeSlider")
    $script:styleDegreeSlider = $script:window.FindName("StyleDegreeSlider")
    $script:rateLabel = $script:window.FindName("RateLabel")
    $script:pitchLabel = $script:window.FindName("PitchLabel")
    $script:volumeLabel = $script:window.FindName("VolumeLabel")
    $script:styleDegreeLabel = $script:window.FindName("StyleDegreeLabel")
    $script:previewTextBox = $script:window.FindName("PreviewTextBox")
    $script:previewButton = $script:window.FindName("PreviewButton")
    $script:saveButton = $script:window.FindName("SaveButton")
    $script:cancelButton = $script:window.FindName("CancelButton")

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
        RobotEffect = "None"
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
            if ($null -ne $savedConfig.RobotEffect) {
                $config.RobotEffect = $savedConfig.RobotEffect
            }
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

    # ✅ 应用配置到界面（使用 script: 作用域）
    # 语音角色选择
    $voiceFound = $false
    foreach ($item in $script:voiceCombo.Items) {
        if ($item.Tag -eq $config.Voice) {
            $script:voiceCombo.SelectedItem = $item
            $voiceFound = $true
            break
        }
    }
    if (-not $voiceFound) { $script:voiceCombo.SelectedIndex = 0 }

    # 情感检测开关
    $script:useAutoDetectionCheckBox.IsChecked = $config.EmotionSettings.UseAutoDetection

    # 默认情感风格
    $defaultEmotionFound = $false
    foreach ($item in $script:defaultEmotionCombo.Items) {
        if ($null -ne $item.Tag -and $item.Tag -eq $config.EmotionSettings.DefaultEmotion) {
            $script:defaultEmotionCombo.SelectedItem = $item
            $defaultEmotionFound = $true
            break
        }
    }
    if (-not $defaultEmotionFound) { $script:defaultEmotionCombo.SelectedIndex = 0 }

    # 成功情感
    $successEmotionFound = $false
    foreach ($item in $script:successEmotionCombo.Items) {
        if ($null -ne $item.Tag -and $item.Tag -eq $config.EmotionSettings.AutoMapping.Success) {
            $script:successEmotionCombo.SelectedItem = $item
            $successEmotionFound = $true
            break
        }
    }
    if (-not $successEmotionFound) { $script:successEmotionCombo.SelectedIndex = 0 }

    # 错误情感
    $errorEmotionFound = $false
    foreach ($item in $script:errorEmotionCombo.Items) {
        if ($null -ne $item.Tag -and $item.Tag -eq $config.EmotionSettings.AutoMapping.Error) {
            $script:errorEmotionCombo.SelectedItem = $item
            $errorEmotionFound = $true
            break
        }
    }
    if (-not $errorEmotionFound) { $script:errorEmotionCombo.SelectedIndex = 0 }

    # 警告情感
    $warningEmotionFound = $false
    foreach ($item in $script:warningEmotionCombo.Items) {
        if ($null -ne $item.Tag -and $item.Tag -eq $config.EmotionSettings.AutoMapping.Warning) {
            $script:warningEmotionCombo.SelectedItem = $item
            $warningEmotionFound = $true
            break
        }
    }
    if (-not $warningEmotionFound) { $script:warningEmotionCombo.SelectedIndex = 0 }

    # 询问情感
    $questionEmotionFound = $false
    foreach ($item in $script:questionEmotionCombo.Items) {
        if ($null -ne $item.Tag -and $item.Tag -eq $config.EmotionSettings.AutoMapping.Question) {
            $script:questionEmotionCombo.SelectedItem = $item
            $questionEmotionFound = $true
            break
        }
    }
    if (-not $questionEmotionFound) { $script:questionEmotionCombo.SelectedIndex = 0 }

    # 机器人音效
    if ($null -ne $script:robotEffectCombo) {
        $robotEffectFound = $false
        foreach ($item in $script:robotEffectCombo.Items) {
            if ($null -ne $item.Tag -and $item.Tag -eq $config.RobotEffect) {
                $script:robotEffectCombo.SelectedItem = $item
                $robotEffectFound = $true
                break
            }
        }
        if (-not $robotEffectFound) { $script:robotEffectCombo.SelectedIndex = 0 }
    }

    # ✅ 滑块事件 - 使用 $this + $script: 模式（社区验证的最佳实践）
    $script:rateSlider.Add_ValueChanged({
        try {
            # $this 自动指向触发事件的滑块，永远不会失效
            if ($null -eq $this -or $null -eq $script:rateLabel) { return }

            $value = [math]::Round($this.Value)
            $sign = if ($value -ge 0) { "+" } else { "" }
            $script:rateLabel.Text = "语速: $sign$value%"
        } catch {
            Write-Warning "Rate slider event failed: $_"
        }
    })

    $script:pitchSlider.Add_ValueChanged({
        try {
            if ($null -eq $this -or $null -eq $script:pitchLabel) { return }

            $value = [math]::Round($this.Value)
            $sign = if ($value -ge 0) { "+" } else { "" }
            $script:pitchLabel.Text = "音调: $sign${value}st"
        } catch {
            Write-Warning "Pitch slider event failed: $_"
        }
    })

    $script:volumeSlider.Add_ValueChanged({
        try {
            if ($null -eq $this -or $null -eq $script:volumeLabel) { return }

            $value = [math]::Round($this.Value)
            $script:volumeLabel.Text = "音量: $value%"
        } catch {
            Write-Warning "Volume slider event failed: $_"
        }
    })

    $script:styleDegreeSlider.Add_ValueChanged({
        try {
            if ($null -eq $this -or $null -eq $script:styleDegreeLabel) { return }

            $value = [math]::Round($this.Value, 1)
            $script:styleDegreeLabel.Text = "情感强度: $value"
        } catch {
            Write-Warning "StyleDegree slider event failed: $_"
        }
    })

    # ✅ 在事件注册后再设置初始值
    $script:rateSlider.Value = $config.Rate
    $script:pitchSlider.Value = $config.Pitch
    $script:volumeSlider.Value = $config.Volume
    $script:styleDegreeSlider.Value = $config.StyleDegree

    # 手动初始化标签显示（防止事件未触发）
    try {
        $rateValue = [math]::Round($config.Rate)
        $rateSign = if ($rateValue -ge 0) { "+" } else { "" }
        $script:rateLabel.Text = "语速: $rateSign$rateValue%"

        $pitchValue = [math]::Round($config.Pitch)
        $pitchSign = if ($pitchValue -ge 0) { "+" } else { "" }
        $script:pitchLabel.Text = "音调: $pitchSign${pitchValue}st"

        $volumeValue = [math]::Round($config.Volume)
        $script:volumeLabel.Text = "音量: $volumeValue%"

        $styleDegreeValue = [math]::Round($config.StyleDegree, 1)
        $script:styleDegreeLabel.Text = "情感强度: $styleDegreeValue"
    } catch {
        Write-Warning "Failed to initialize labels: $_"
    }

    # 全局变量：当前播放进程
    $script:currentPlaybackProcess = $null

    # ✅ 试听按钮（使用 script: 作用域）
    $script:previewButton.Add_Click({
        # 如果正在播放，点击停止
        if ($script:currentPlaybackProcess -and -not $script:currentPlaybackProcess.HasExited) {
            try {
                $script:currentPlaybackProcess.Kill()
                $script:currentPlaybackProcess = $null
            } catch {
                # 进程可能已经退出，忽略错误
                Write-Verbose "Failed to kill playback process: $_"
            }
            $script:previewButton.Content = "🔊 试听语音"
            return
        }

        # 获取当前选中的值
        $voice = if ($null -ne $script:voiceCombo.SelectedItem) { $script:voiceCombo.SelectedItem.Tag } else { "zh-CN-XiaoxiaoNeural" }
        $defaultEmotion = if ($null -ne $script:defaultEmotionCombo.SelectedItem) { $script:defaultEmotionCombo.SelectedItem.Tag } else { "assistant" }
        $rate = [math]::Round($script:rateSlider.Value)
        $pitch = [math]::Round($script:pitchSlider.Value)
        $volume = [math]::Round($script:volumeSlider.Value)
        $styleDegree = [math]::Round($script:styleDegreeSlider.Value, 1)
        $text = $script:previewTextBox.Text

        if ([string]::IsNullOrWhiteSpace($text)) {
            [System.Windows.MessageBox]::Show("请输入预览文本", "提示", "OK", "Warning")
            return
        }

        $script:previewButton.Content = "⏹ 停止播放"

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
                    UseAutoDetection = $script:useAutoDetectionCheckBox.IsChecked
                    DefaultEmotion = $defaultEmotion
                    AutoMapping = @{
                        Success = if ($null -ne $script:successEmotionCombo.SelectedItem) { $script:successEmotionCombo.SelectedItem.Tag } else { "cheerful" }
                        Error = if ($null -ne $script:errorEmotionCombo.SelectedItem) { $script:errorEmotionCombo.SelectedItem.Tag } else { "calm" }
                        Warning = if ($null -ne $script:warningEmotionCombo.SelectedItem) { $script:warningEmotionCombo.SelectedItem.Tag } else { "serious" }
                        Question = if ($null -ne $script:questionEmotionCombo.SelectedItem) { $script:questionEmotionCombo.SelectedItem.Tag } else { "gentle" }
                    }
                }
            }

            $tempConfigPath = Join-Path $env:TEMP "voice-config-preview.json"
            $tempConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempConfigPath -Encoding UTF8

            # 备份原配置
            Copy-Item $configPath "$configPath.bak" -Force -ErrorAction SilentlyContinue

            # 使用临时配置
            Copy-Item $tempConfigPath $configPath -Force

            # 在后台进程中播放，使用 EmotionStyle 参数传递默认情感
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "powershell"
            $psi.Arguments = "-ExecutionPolicy Bypass -NoProfile -Command `"& '$playScript' -Text '$text' -Voice '$voice' -EmotionStyle '$defaultEmotion'`""
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
                    $script:previewButton.Content = "✓ 播放完成"

                    # 1秒后恢复按钮
                    $resetTimer = New-Object System.Windows.Threading.DispatcherTimer
                    $resetTimer.Interval = [TimeSpan]::FromSeconds(1)
                    $resetTimer.Add_Tick({
                        $resetTimer.Stop()
                        $script:previewButton.Content = "🔊 试听语音"
                    })
                    $resetTimer.Start()
                }
            })
            $timer.Start()

        } catch {
            [System.Windows.MessageBox]::Show("预览失败: $_", "错误", "OK", "Error")
            $script:previewButton.Content = "🔊 试听语音"
            # 恢复原配置
            if (Test-Path "$configPath.bak") {
                Move-Item "$configPath.bak" $configPath -Force -ErrorAction SilentlyContinue
            }
        }
    })

    # ✅ 保存按钮（使用 script: 作用域）
    $script:saveButton.Add_Click({
        try {
            # 添加空值检查，防止闪退
            if ($null -ne $script:voiceCombo.SelectedItem -and $null -ne $script:voiceCombo.SelectedItem.Tag) {
                $config.Voice = $script:voiceCombo.SelectedItem.Tag
            }

            $config.Rate = [math]::Round($script:rateSlider.Value)
            $config.Pitch = [math]::Round($script:pitchSlider.Value)
            $config.Volume = [math]::Round($script:volumeSlider.Value)
            $config.StyleDegree = [math]::Round($script:styleDegreeSlider.Value, 1)
            $config.EmotionSettings.UseAutoDetection = $script:useAutoDetectionCheckBox.IsChecked

            # 安全获取情感设置
            if ($null -ne $script:defaultEmotionCombo.SelectedItem -and $null -ne $script:defaultEmotionCombo.SelectedItem.Tag) {
                $config.EmotionSettings.DefaultEmotion = $script:defaultEmotionCombo.SelectedItem.Tag
            }
            if ($null -ne $script:successEmotionCombo.SelectedItem -and $null -ne $script:successEmotionCombo.SelectedItem.Tag) {
                $config.EmotionSettings.AutoMapping.Success = $script:successEmotionCombo.SelectedItem.Tag
            }
            if ($null -ne $script:errorEmotionCombo.SelectedItem -and $null -ne $script:errorEmotionCombo.SelectedItem.Tag) {
                $config.EmotionSettings.AutoMapping.Error = $script:errorEmotionCombo.SelectedItem.Tag
            }
            if ($null -ne $script:warningEmotionCombo.SelectedItem -and $null -ne $script:warningEmotionCombo.SelectedItem.Tag) {
                $config.EmotionSettings.AutoMapping.Warning = $script:warningEmotionCombo.SelectedItem.Tag
            }
            if ($null -ne $script:questionEmotionCombo.SelectedItem -and $null -ne $script:questionEmotionCombo.SelectedItem.Tag) {
                $config.EmotionSettings.AutoMapping.Question = $script:questionEmotionCombo.SelectedItem.Tag
            }

            # 安全获取机器人音效设置
            if ($null -ne $script:robotEffectCombo.SelectedItem -and $null -ne $script:robotEffectCombo.SelectedItem.Tag) {
                $config.RobotEffect = $script:robotEffectCombo.SelectedItem.Tag
            }

            $config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8
            [System.Windows.MessageBox]::Show("配置已保存！", "成功", "OK", "Information")
            $script:window.Close()
        } catch {
            [System.Windows.MessageBox]::Show("保存失败: $_", "错误", "OK", "Error")
        }
    })

    # ✅ 取消按钮（使用 script: 作用域）
    $script:cancelButton.Add_Click({
        $script:window.Close()
    })

    # ✅ 窗口关闭事件：清理播放进程（使用 script: 作用域）
    $script:window.Add_Closed({
        if ($script:currentPlaybackProcess -and -not $script:currentPlaybackProcess.HasExited) {
            try {
                $script:currentPlaybackProcess.Kill()
            } catch {
                # 进程可能已经退出，忽略错误
                Write-Verbose "Failed to kill playback process on window close: $_"
            }
        }
    })

    # ✅ 显示窗口（使用 script: 作用域）
    $null = $script:window.ShowDialog()
}

# 运行界面
Show-VoiceConfigUI
