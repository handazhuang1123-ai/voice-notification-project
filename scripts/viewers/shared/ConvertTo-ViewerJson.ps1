function ConvertTo-ViewerJson {
    <#
    .SYNOPSIS
        Convert data items to viewer JSON format
        将数据项转换为查看器 JSON 格式

    .DESCRIPTION
        Converts an array of data items to the standardized JSON format used by viewer applications.
        Wraps the data with metadata including version, dataType, and generation timestamp.
        将数据项数组转换为查看器应用程序使用的标准化 JSON 格式。
        使用版本、数据类型和生成时间戳等元数据包装数据。

    .PARAMETER Items
        Array of data items to convert
        要转换的数据项数组

    .PARAMETER DataType
        Type of data (e.g., "logs", "rag-memory")
        数据类型（例如 "logs"、"rag-memory"）

    .PARAMETER OutputPath
        Path to output JSON file
        输出 JSON 文件的路径

    .PARAMETER Version
        Data format version (default: "1.0")
        数据格式版本（默认："1.0"）

    .EXAMPLE
        $logItems = @(
            @{sessionId = "123"; message = "Test"}
        )
        ConvertTo-ViewerJson -Items $logItems -DataType "logs" -OutputPath "output.json"

        Converts log items to viewer JSON format and saves to output.json
        将日志项转换为查看器 JSON 格式并保存到 output.json

    .NOTES
        Author: 壮爸
        Version: 1.0
        Last Modified: 2025-01-16
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [array]$Items,

        [Parameter(Mandatory = $true)]
        [string]$DataType,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath,

        [Parameter(Mandatory = $false)]
        [string]$Version = "1.0"
    )

    try {
        # Create viewer data structure | 创建查看器数据结构
        $ViewerData = [ordered]@{
            version     = $Version
            dataType    = $DataType
            generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            items       = $Items
        }

        # Ensure output directory exists | 确保输出目录存在
        $OutputDir = Split-Path -Path $OutputPath -Parent
        if ($OutputDir -and -not (Test-Path -Path $OutputDir)) {
            New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
            Write-Verbose "Created output directory: $OutputDir"
        }

        # Convert to JSON with proper formatting | 转换为格式化的 JSON
        $JsonContent = $ViewerData | ConvertTo-Json -Depth 10 -Compress:$false

        # Adjust indentation to 2 spaces per .editorconfig (ConvertTo-Json uses 4 by default)
        # 调整缩进为 2 空格以符合 .editorconfig（ConvertTo-Json 默认使用 4 空格）
        $Lines = $JsonContent -split "`r?`n"
        $JsonContent = ($Lines | ForEach-Object {
            if ($_ -match '^(    )+') {
                $IndentCount = $Matches[0].Length / 4
                ('  ' * $IndentCount) + $_.Substring($Matches[0].Length)
            } else {
                $_
            }
        }) -join "`n"

        # Convert to LF line endings per .editorconfig (JSON files should use LF)
        # 转换为 LF 换行符以符合 .editorconfig（JSON 文件应使用 LF）
        $JsonContent = $JsonContent -replace "`r`n", "`n"

        # Save to file with UTF-8 (no BOM) encoding | 使用 UTF-8（无 BOM）编码保存到文件
        # Use FileStream with shared read access to allow HTTP server to read while writing
        # 使用带共享读取访问的 FileStream，允许 HTTP 服务器在写入时读取
        try {
            $Encoding = [System.Text.UTF8Encoding]::new($false)
            $FileStream = [System.IO.File]::Open(
                $OutputPath,
                [System.IO.FileMode]::Create,
                [System.IO.FileAccess]::Write,
                [System.IO.FileShare]::Read  # Allow others to read while we write
            )
            $Writer = New-Object System.IO.StreamWriter($FileStream, $Encoding)
            $Writer.Write($JsonContent)
            $Writer.Flush()
            $Writer.Close()
            $FileStream.Close()
        }
        catch {
            if ($Writer) { $Writer.Dispose() }
            if ($FileStream) { $FileStream.Dispose() }
            throw
        }

        Write-Verbose "Successfully converted $($Items.Count) items to viewer JSON format"
        Write-Verbose "Output saved to: $OutputPath"

        return $true
    }
    catch {
        Write-Error "Failed to convert to viewer JSON: $_"
        return $false
    }
}
