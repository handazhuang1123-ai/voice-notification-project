# Test file for pre-commit hook
# 测试 pre-commit 钩子的文件

function Get-TestData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    Write-Output "Hello, $Name"
}
