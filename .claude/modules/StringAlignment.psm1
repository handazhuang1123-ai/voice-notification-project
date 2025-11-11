# ==============================================================================
# Module: StringAlignment.psm1
# Purpose: 中文字符显示宽度计算和字符串对齐工具
# Author: 壮爸
# Created: 2025-01-11
# ==============================================================================

#Requires -Version 5.1

function Get-DisplayWidth {
    <#
    .SYNOPSIS
        Calculate the display width of a string in the terminal
        计算字符串在终端中的显示宽度

    .DESCRIPTION
        Uses PowerShell's built-in RawUI API to calculate the actual display width
        of a string, correctly handling CJK (Chinese, Japanese, Korean) characters
        that occupy 2 character cells.
        使用 PowerShell 内置 RawUI API 计算字符串的实际显示宽度，
        正确处理占用2个字符单元的中文字符。

    .PARAMETER Text
        The text string to measure
        要测量的文本字符串

    .OUTPUTS
        System.Int32
        The display width in character cells
        以字符单元为单位的显示宽度

    .EXAMPLE
        Get-DisplayWidth "Hello"
        # Returns: 5

    .EXAMPLE
        Get-DisplayWidth "你好世界"
        # Returns: 8 (each Chinese character = 2 cells)

    .EXAMPLE
        Get-DisplayWidth "Hello 世界"
        # Returns: 11 (5 ASCII + 1 space + 4 Chinese = 2 cells each)

    .NOTES
        Author: 壮爸
        Requires: PowerShell 5.1+ with console host
        使用 $Host.UI.RawUI.LengthInBufferCells() 方法
    #>
    [CmdletBinding()]
    [OutputType([int])]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [AllowEmptyString()]
        [string]$Text
    )

    process {
        if ([string]::IsNullOrEmpty($Text)) {
            return 0
        }

        try {
            return $Host.UI.RawUI.LengthInBufferCells($Text)
        }
        catch {
            # Fallback: 简单估算（ASCII=1，其他=2）
            $width = 0
            foreach ($char in $Text.ToCharArray()) {
                if ([int]$char -lt 128) {
                    $width += 1
                }
                else {
                    $width += 2
                }
            }
            return $width
        }
    }
}

function Format-AlignedString {
    <#
    .SYNOPSIS
        Pad string to specified width with proper CJK character handling
        将字符串填充到指定宽度，正确处理中文字符

    .DESCRIPTION
        Aligns strings to a fixed display width by adding spaces,
        correctly calculating the display width of CJK characters.
        通过添加空格将字符串对齐到固定显示宽度，
        正确计算中文字符的显示宽度。

    .PARAMETER Text
        The text string to align
        要对齐的文本字符串

    .PARAMETER Width
        Target display width in character cells
        目标显示宽度（字符单元）

    .PARAMETER Alignment
        Alignment type: Left, Right, or Center
        对齐方式：Left（左对齐）、Right（右对齐）或 Center（居中）

    .PARAMETER TruncateIfTooLong
        If true, truncate strings that exceed the target width
        如果为 true，截断超过目标宽度的字符串

    .OUTPUTS
        System.String
        The aligned string
        对齐后的字符串

    .EXAMPLE
        Format-AlignedString "Hello" 10
        # Returns: "Hello     " (5 spaces added)

    .EXAMPLE
        Format-AlignedString "你好" 10
        # Returns: "你好      " (6 spaces added, because "你好" = 4 cells)

    .EXAMPLE
        Format-AlignedString "Test" 10 -Alignment Center
        # Returns: "   Test   " (centered)

    .EXAMPLE
        Format-AlignedString "Hello 世界" 8 -TruncateIfTooLong
        # Returns: "Hello..." (truncated because display width = 11 > 8)

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [AllowEmptyString()]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [ValidateRange(0, 1000)]
        [int]$Width,

        [Parameter(Mandatory = $false)]
        [ValidateSet("Left", "Right", "Center")]
        [string]$Alignment = "Left",

        [Parameter(Mandatory = $false)]
        [switch]$TruncateIfTooLong
    )

    process {
        $currentWidth = Get-DisplayWidth $Text

        # 如果文本已超过目标宽度
        if ($currentWidth -gt $Width) {
            if ($TruncateIfTooLong) {
                # 截断字符串
                $truncated = ""
                $accumulatedWidth = 0
                foreach ($char in $Text.ToCharArray()) {
                    $charWidth = Get-DisplayWidth $char
                    if ($accumulatedWidth + $charWidth -le ($Width - 3)) {
                        $truncated += $char
                        $accumulatedWidth += $charWidth
                    }
                    else {
                        break
                    }
                }
                return $truncated + "..."
            }
            else {
                # 不截断，直接返回
                return $Text
            }
        }

        # 计算需要填充的空格数
        $paddingNeeded = $Width - $currentWidth

        switch ($Alignment) {
            "Left" {
                return $Text + (" " * $paddingNeeded)
            }
            "Right" {
                return (" " * $paddingNeeded) + $Text
            }
            "Center" {
                $leftPadding = [Math]::Floor($paddingNeeded / 2)
                $rightPadding = $paddingNeeded - $leftPadding
                return (" " * $leftPadding) + $Text + (" " * $rightPadding)
            }
        }
    }
}

function New-BorderedLine {
    <#
    .SYNOPSIS
        Create a line with border characters and properly aligned content
        创建带有边框字符和正确对齐内容的行

    .DESCRIPTION
        Wraps content with border characters (default: ║) and ensures
        the content is properly aligned to fit within the specified width.
        使用边框字符（默认：║）包裹内容，并确保内容正确对齐
        以适应指定宽度。

    .PARAMETER Content
        The content to display
        要显示的内容

    .PARAMETER Width
        Width of the content area (excluding borders)
        内容区域的宽度（不包括边框）

    .PARAMETER BorderLeft
        Left border character (default: ║)
        左边框字符（默认：║）

    .PARAMETER BorderRight
        Right border character (default: ║)
        右边框字符（默认：║）

    .PARAMETER Alignment
        Content alignment: Left, Right, or Center
        内容对齐方式：Left、Right 或 Center

    .PARAMETER TruncateIfTooLong
        If true, truncate strings that exceed the target width
        如果为 true，截断超过目标宽度的字符串

    .OUTPUTS
        System.String
        A bordered line with properly aligned content
        带有正确对齐内容的边框行

    .EXAMPLE
        New-BorderedLine "Hello" 20
        # Returns: "║Hello               ║"

    .EXAMPLE
        New-BorderedLine "测试文本" 20
        # Returns: "║测试文本            ║"

    .EXAMPLE
        New-BorderedLine "Center" 20 -Alignment Center
        # Returns: "║       Center       ║"

    .EXAMPLE
        New-BorderedLine "Very long text that exceeds width" 20 -TruncateIfTooLong
        # Returns: "║Very long text...   ║"

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content,

        [Parameter(Mandatory = $true)]
        [int]$Width,

        [Parameter(Mandatory = $false)]
        [string]$BorderLeft = "|",

        [Parameter(Mandatory = $false)]
        [string]$BorderRight = "|",

        [Parameter(Mandatory = $false)]
        [ValidateSet("Left", "Right", "Center")]
        [string]$Alignment = "Left",

        [Parameter(Mandatory = $false)]
        [switch]$TruncateIfTooLong
    )

    $aligned = Format-AlignedString -Text $Content -Width $Width -Alignment $Alignment -TruncateIfTooLong:$TruncateIfTooLong
    return "$BorderLeft$aligned$BorderRight"
}

# 导出函数
Export-ModuleMember -Function Get-DisplayWidth, Format-AlignedString, New-BorderedLine
