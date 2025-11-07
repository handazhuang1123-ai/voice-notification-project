function New-SSML {
    <#
    .SYNOPSIS
        Generate SSML markup for Edge-TTS with emotion and prosody control
        生成带有情感和韵律控制的 Edge-TTS SSML 标记

    .DESCRIPTION
        Creates SSML (Speech Synthesis Markup Language) XML for Microsoft Edge TTS
        with support for emotion styles, rate, pitch, and volume control.
        创建用于 Microsoft Edge TTS 的 SSML XML，支持情感风格、语速、音调和音量控制。

    .PARAMETER Text
        The text to be converted to speech
        要转换为语音的文本

    .PARAMETER Voice
        Voice name (default: zh-CN-XiaoxiaoNeural)
        语音名称（默认：zh-CN-XiaoxiaoNeural）

    .PARAMETER Style
        Emotion style (assistant, chat, cheerful, calm, serious, gentle, etc.)
        情感风格（assistant、chat、cheerful、calm、serious、gentle 等）

    .PARAMETER StyleDegree
        Emotion intensity (0.01-2.0, default: 1.2)
        情感强度（0.01-2.0，默认：1.2）

    .PARAMETER Rate
        Speech rate (e.g., "-8%", "+10%", default: "-8%")
        语速（例如："-8%"、"+10%"，默认："-8%"）

    .PARAMETER Pitch
        Pitch adjustment (e.g., "+1st", "-2st", default: "+1st")
        音调调整（例如："+1st"、"-2st"，默认："+1st"）

    .PARAMETER Volume
        Volume level (e.g., "85%", "+6dB", default: "85%")
        音量级别（例如："85%"、"+6dB"，默认："85%"）

    .EXAMPLE
        New-SSML -Text "先生,任务已完成" -Style "assistant"
        生成专业助手风格的 SSML

    .EXAMPLE
        New-SSML -Text "Task completed, sir" -Voice "en-US-GuyNeural" -Style "calm"
        生成英文冷静风格的 SSML

    .NOTES
        Author: 壮爸
        Version: 1.0
        Requires: Node.js edge-tts package
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $false)]
        [string]$Voice = "zh-CN-XiaoxiaoNeural",

        [Parameter(Mandatory = $false)]
        [string]$Style = "assistant",

        [Parameter(Mandatory = $false)]
        [double]$StyleDegree = 1.2,

        [Parameter(Mandatory = $false)]
        [string]$Rate = "-8%",

        [Parameter(Mandatory = $false)]
        [string]$Pitch = "+1st",

        [Parameter(Mandatory = $false)]
        [string]$Volume = "85%"
    )

    # XML 转义处理
    $EscapedText = $Text `
        -replace '&', '&amp;' `
        -replace '<', '&lt;' `
        -replace '>', '&gt;' `
        -replace '"', '&quot;' `
        -replace "'", '&apos;'

    # 生成 SSML
    $SSML = @"
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="$Voice">
    <mstts:express-as style="$Style" styledegree="$StyleDegree">
      <prosody rate="$Rate" pitch="$Pitch" volume="$Volume">
        $EscapedText
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
"@

    return $SSML
}
