# Show-VoiceConfigUI.ps1
# 语音通知配置界面 (WPF 实现)

<#
.SYNOPSIS
    显示语音配置界面,支持参数调整和实时预览

.DESCRIPTION
    使用 WPF 技术实现的图形化配置界面,支持:
    - 选择中文语音角色
    - 调整语速和音调
    - 实时试听效果
    - 保存配置到 JSON 文件

.EXAMPLE
    .\Show-VoiceConfigUI.ps1

.NOTES
    需要 PowerShell 5.1+ 和 edge-tts
    Author: 壮爸
#>

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# XAML 界面定义
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="语音通知配置" Height="550" Width="650"
        Background="#F5F5F5" WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize">

    <Grid Margin="25">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- 标题 -->
        <StackPanel Grid.Row="0" Margin="0,0,0,20">
            <TextBlock Text="Voice Notification 语音配置"
                       FontSize="26" FontWeight="Bold" Foreground="#2196F3"/>
            <TextBlock Text="调整语音参数并实时试听效果"
                       FontSize="12" Foreground="Gray" Margin="0,5,0,0"/>
        </StackPanel>

        <!-- 语音选择 -->
        <GroupBox Grid.Row="1" Header="语音角色选择" Margin="0,0,0,15"
                  FontSize="14" FontWeight="SemiBold">
            <StackPanel Margin="10">
                <ComboBox Name="VoiceComboBox" Height="38" FontSize="13">
                    <ComboBoxItem Content="🎭 Xiaoxiao (女声-温柔专业) - 推荐" Tag="zh-CN-XiaoxiaoNeural" IsSelected="True"/>
                    <ComboBoxItem Content="🎙️ Yunxi (男声-自然稳重)" Tag="zh-CN-YunxiNeural"/>
                    <ComboBoxItem Content="😊 Xiaoyi (女声-活泼友好)" Tag="zh-CN-XiaoyiNeural"/>
                    <ComboBoxItem Content="📰 Yunyang (男声-新闻播报)" Tag="zh-CN-YunyangNeural"/>
                    <ComboBoxItem Content="🎵 Xiaomo (女声-温柔抒情)" Tag="zh-CN-XiaomoNeural"/>
                </ComboBox>
            </StackPanel>
        </GroupBox>

        <!-- 语速调整 -->
        <GroupBox Grid.Row="2" Header="语速控制" Margin="0,0,0,15"
                  FontSize="14" FontWeight="SemiBold">
            <StackPanel Margin="10">
                <TextBlock Name="RateLabel" Text="当前语速: 0% (标准)" FontSize="12" Margin="0,0,0,8"/>
                <Slider Name="RateSlider" Minimum="-30" Maximum="30" Value="-8"
                        TickFrequency="5" IsSnapToTickEnabled="True"
                        Height="28"/>
                <Grid Margin="0,5,0,0">
                    <TextBlock Text="← 慢" FontSize="10" HorizontalAlignment="Left" Foreground="Gray"/>
                    <TextBlock Text="快 →" FontSize="10" HorizontalAlignment="Right" Foreground="Gray"/>
                </Grid>
                <TextBlock Text="💡 提示: -8% ~ -10% 听起来更自然"
                           FontSize="10" Foreground="#FF9800" Margin="0,5,0,0"/>
            </StackPanel>
        </GroupBox>

        <!-- 音调调整 -->
        <GroupBox Grid.Row="3" Header="音调控制" Margin="0,0,0,15"
                  FontSize="14" FontWeight="SemiBold">
            <StackPanel Margin="10">
                <TextBlock Name="PitchLabel" Text="当前音调: 0st (标准)" FontSize="12" Margin="0,0,0,8"/>
                <Slider Name="PitchSlider" Minimum="-5" Maximum="5" Value="1"
                        TickFrequency="1" IsSnapToTickEnabled="True"
                        Height="28"/>
                <Grid Margin="0,5,0,0">
                    <TextBlock Text="← 低" FontSize="10" HorizontalAlignment="Left" Foreground="Gray"/>
                    <TextBlock Text="高 →" FontSize="10" HorizontalAlignment="Right" Foreground="Gray"/>
                </Grid>
                <TextBlock Text="💡 提示: ±1 ~ ±2 semitone 最自然"
                           FontSize="10" Foreground="#FF9800" Margin="0,5,0,0"/>
            </StackPanel>
        </GroupBox>

        <!-- 音量调整 -->
        <GroupBox Grid.Row="4" Header="音量控制" Margin="0,0,0,15"
                  FontSize="14" FontWeight="SemiBold">
            <StackPanel Margin="10">
                <TextBlock Name="VolumeLabel" Text="当前音量: 100%" FontSize="12" Margin="0,0,0,8"/>
                <Slider Name="VolumeSlider" Minimum="50" Maximum="150" Value="100"
                        TickFrequency="10" IsSnapToTickEnabled="True"
                        Height="28"/>
                <Grid Margin="0,5,0,0">
                    <TextBlock Text="← 轻" FontSize="10" HorizontalAlignment="Left" Foreground="Gray"/>
                    <TextBlock Text="响 →" FontSize="10" HorizontalAlignment="Right" Foreground="Gray"/>
                </Grid>
            </StackPanel>
        </GroupBox>

        <!-- 预览区域 -->
        <GroupBox Grid.Row="5" Header="语音预览" FontSize="14" FontWeight="SemiBold">
            <StackPanel Margin="10">
                <TextBlock Text="测试文本:" FontSize="12" Margin="0,0,0,5"/>
                <TextBox Name="PreviewTextBox"
                         Text="先生,任务已完成。创建了用户手册,包含5个章节。"
                         TextWrapping="Wrap" Height="75" Margin="0,0,0,12"
                         FontSize="12" Padding="8"/>
                <Button Name="PreviewButton" Content="🔊 试听语音效果"
                        Height="42" FontSize="14" Background="#4CAF50"
                        Foreground="White" Cursor="Hand"
                        BorderBrush="Transparent"/>
                <TextBlock Name="StatusLabel" Text="" FontSize="11" Foreground="Gray"
                           Margin="0,8,0,0" TextAlignment="Center"/>
            </StackPanel>
        </GroupBox>

        <!-- 底部按钮 -->
        <StackPanel Grid.Row="6" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,15,0,0">
            <Button Name="SaveButton" Content="✅ 保存配置"
                    Width="110" Height="38" Margin="0,0,12,0"
                    Background="#2196F3" Foreground="White" FontSize="13"
                    BorderBrush="Transparent" Cursor="Hand"/>
            <Button Name="CancelButton" Content="❌ 取消"
                    Width="110" Height="38"
                    Background="#9E9E9E" Foreground="White" FontSize="13"
                    BorderBrush="Transparent" Cursor="Hand"/>
        </StackPanel>
    </Grid>
</Window>
"@

function Show-VoiceConfigUI {
    <#
    .SYNOPSIS
        显示语音配置界面
    #>

    # 加载 XAML
    $reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml))
    $window = [Windows.Markup.XamlReader]::Load($reader)

    # 获取控件引用
    $voiceCombo = $window.FindName("VoiceComboBox")
    $rateSlider = $window.FindName("RateSlider")
    $pitchSlider = $window.FindName("PitchSlider")
    $volumeSlider = $window.FindName("VolumeSlider")
    $rateLabel = $window.FindName("RateLabel")
    $pitchLabel = $window.FindName("PitchLabel")
    $volumeLabel = $window.FindName("VolumeLabel")
    $previewTextBox = $window.FindName("PreviewTextBox")
    $previewButton = $window.FindName("PreviewButton")
    $statusLabel = $window.FindName("StatusLabel")
    $saveButton = $window.FindName("SaveButton")
    $cancelButton = $window.FindName("CancelButton")

    # 配置文件路径
    $configPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".claude\hooks\voice-config.json"

    # 默认配置
    $config = @{
        Voice = "zh-CN-XiaoxiaoNeural"
        Rate = -8
        Pitch = 1
        Volume = 100
    }

    # 加载现有配置
    if (Test-Path $configPath) {
        try {
            $savedConfig = Get-Content $configPath -Raw | ConvertFrom-Json
            $config.Voice = $savedConfig.Voice
            $config.Rate = $savedConfig.Rate
            $config.Pitch = $savedConfig.Pitch
            $config.Volume = $savedConfig.Volume

            # 应用到界面
            $rateSlider.Value = $config.Rate
            $pitchSlider.Value = $config.Pitch
            $volumeSlider.Value = $config.Volume

            # 设置语音选择
            for ($i = 0; $i -lt $voiceCombo.Items.Count; $i++) {
                if ($voiceCombo.Items[$i].Tag -eq $config.Voice) {
                    $voiceCombo.SelectedIndex = $i
                    break
                }
            }
        }
        catch {
            Write-Warning "加载配置失败,使用默认值: $_"
        }
    }

    # 事件: Rate 滑块变化
    $rateSlider.Add_ValueChanged({
        $value = [math]::Round($rateSlider.Value)
        $status = if ($value -lt 0) { "较慢" } elseif ($value -gt 0) { "较快" } else { "标准" }
        $rateLabel.Text = "当前语速: $value% ($status)"
    })

    # 事件: Pitch 滑块变化
    $pitchSlider.Add_ValueChanged({
        $value = [math]::Round($pitchSlider.Value)
        $status = if ($value -lt 0) { "较低" } elseif ($value -gt 0) { "较高" } else { "标准" }
        $pitchLabel.Text = "当前音调: ${value}st ($status)"
    })

    # 事件: Volume 滑块变化
    $volumeSlider.Add_ValueChanged({
        $value = [math]::Round($volumeSlider.Value)
        $volumeLabel.Text = "当前音量: $value%"
    })

    # 事件: 试听按钮
    $previewButton.Add_Click({
        $voice = $voiceCombo.SelectedItem.Tag
        $rate = [math]::Round($rateSlider.Value)
        $pitch = [math]::Round($pitchSlider.Value)
        $volume = [math]::Round($volumeSlider.Value)
        $text = $previewTextBox.Text

        if ([string]::IsNullOrWhiteSpace($text)) {
            $statusLabel.Text = "⚠️ 请输入测试文本"
            $statusLabel.Foreground = "Red"
            return
        }

        # 禁用按钮防止重复点击
        $previewButton.IsEnabled = $false
        $previewButton.Content = "⏳ 生成中..."
        $statusLabel.Text = "正在生成语音,请稍候..."
        $statusLabel.Foreground = "Gray"

        # 构建参数
        $rateStr = if ($rate -ge 0) { "+$rate%" } else { "$rate%" }
        $pitchStr = if ($pitch -ge 0) { "+${pitch}st" } else { "${pitch}st" }
        $volumeStr = if ($volume -ge 0) { "+$($volume - 100)%" } else { "$($volume - 100)%" }

        $tempFile = Join-Path $env:TEMP "voice-preview-$(Get-Date -Format 'yyyyMMddHHmmss').mp3"

        try {
            # 调用 edge-tts
            $result = edge-tts --voice $voice `
                               --rate $rateStr `
                               --pitch $pitchStr `
                               --volume $volumeStr `
                               --text $text `
                               --write-media $tempFile 2>&1

            if (Test-Path $tempFile) {
                # 播放音频
                Add-Type -AssemblyName PresentationCore
                $player = New-Object System.Windows.Media.MediaPlayer
                $player.Open([uri]$tempFile)
                $player.Play()

                $statusLabel.Text = "✅ 播放完成"
                $statusLabel.Foreground = "Green"

                # 等待播放结束后删除文件
                Start-Sleep -Seconds 5
                Remove-Item $tempFile -ErrorAction SilentlyContinue
            }
            else {
                throw "音频文件生成失败"
            }
        }
        catch {
            $statusLabel.Text = "❌ 生成失败: $_"
            $statusLabel.Foreground = "Red"
            [System.Windows.MessageBox]::Show(
                "语音生成失败,请检查 edge-tts 是否正确安装。`n`n错误详情: $_",
                "错误",
                "OK",
                "Error"
            )
        }
        finally {
            # 恢复按钮
            $previewButton.Content = "🔊 试听语音效果"
            $previewButton.IsEnabled = $true
        }
    })

    # 事件: 保存按钮
    $saveButton.Add_Click({
        $config.Voice = $voiceCombo.SelectedItem.Tag
        $config.Rate = [math]::Round($rateSlider.Value)
        $config.Pitch = [math]::Round($pitchSlider.Value)
        $config.Volume = [math]::Round($volumeSlider.Value)

        try {
            # 保存到 JSON
            $configDir = Split-Path $configPath -Parent
            if (-not (Test-Path $configDir)) {
                New-Item -ItemType Directory -Path $configDir -Force | Out-Null
            }

            $config | ConvertTo-Json | Out-File $configPath -Encoding UTF8

            [System.Windows.MessageBox]::Show(
                "配置已成功保存！`n`n路径: $configPath",
                "保存成功",
                "OK",
                "Information"
            )

            $window.Close()
        }
        catch {
            [System.Windows.MessageBox]::Show(
                "配置保存失败！`n`n错误详情: $_",
                "保存失败",
                "OK",
                "Error"
            )
        }
    })

    # 事件: 取消按钮
    $cancelButton.Add_Click({
        $result = [System.Windows.MessageBox]::Show(
            "确定要放弃修改吗?",
            "确认",
            "YesNo",
            "Question"
        )

        if ($result -eq "Yes") {
            $window.Close()
        }
    })

    # 显示窗口
    $null = $window.ShowDialog()
}

# 运行界面
Show-VoiceConfigUI
