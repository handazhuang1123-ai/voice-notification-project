# Test file with issues - uses alias
# 有问题的测试文件 - 使用别名

function BadFunction {
    # Missing CmdletBinding
    # 缺少 CmdletBinding
    param([string]$Name)

    gci | where { $_.Name -like "*.ps1" }  # Using aliases!
    Write-Host "This is bad"  # Using Write-Host!
}
