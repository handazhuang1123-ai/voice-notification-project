# ==============================================================================
# Script: dispatcher.ps1
# Purpose: 统一调度器 - Claude Code Hook 主入口
# Author: 壮爸
# Created: 2025-01-16
# Architecture: 方案C - 混合架构调度器
# ==============================================================================

#Requires -Version 5.1

param()

# ============== 编码配置 ==============
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============== 主逻辑 ==============
try {
    Write-Verbose "[Dispatcher] === Claude Extensions Dispatcher Started ===" -Verbose

    # 读取stdin一次（在循环外）
    # 使用 $input 自动变量读取管道输入，兼容 PowerShell 管道和标准输入
    $inputData = @($input) -join "`n"

    Write-Verbose "[Dispatcher] Received input: $($inputData.Length) characters" -Verbose

    # 获取扩展目录路径
    $ExtensionsPath = Join-Path $PSScriptRoot "extensions"
    Write-Verbose "[Dispatcher] Extensions path: $ExtensionsPath" -Verbose

    if (-not (Test-Path $ExtensionsPath)) {
        Write-Verbose "[Dispatcher] Extensions directory not found, exiting" -Verbose
        exit 0
    }

    # 获取所有扩展目录
    $Extensions = Get-ChildItem -Path $ExtensionsPath -Directory -ErrorAction SilentlyContinue

    if ($null -eq $Extensions -or $Extensions.Count -eq 0) {
        Write-Verbose "[Dispatcher] No extensions found, exiting" -Verbose
        exit 0
    }

    Write-Verbose "[Dispatcher] Found $($Extensions.Count) extension(s)" -Verbose

    # 遍历每个扩展
    foreach ($Extension in $Extensions) {
        $ExtensionName = $Extension.Name
        $ConfigFile = Join-Path $Extension.FullName "config.json"
        $MainScript = Join-Path $Extension.FullName "$ExtensionName.ps1"

        Write-Verbose "[Dispatcher] Processing extension: $ExtensionName" -Verbose

        # 检查配置文件
        if (-not (Test-Path $ConfigFile)) {
            Write-Verbose "[Dispatcher] No config.json found for $ExtensionName, skipping" -Verbose
            continue
        }

        # 读取配置
        try {
            $ConfigContent = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
            $IsEnabled = $ConfigContent.enabled

            # 如果未定义 enabled 字段，默认为启用
            if ($null -eq $IsEnabled) {
                $IsEnabled = $true
            }

            Write-Verbose "[Dispatcher] Extension '$ExtensionName' enabled: $IsEnabled" -Verbose

            # 如果禁用，跳过
            if ($IsEnabled -eq $false) {
                Write-Verbose "[Dispatcher] Extension '$ExtensionName' is disabled, skipping" -Verbose
                continue
            }

        } catch {
            Write-Verbose "[Dispatcher] Failed to parse config for $ExtensionName`: $($_.Exception.Message)" -Verbose
            continue
        }

        # 检查主脚本
        if (-not (Test-Path $MainScript)) {
            Write-Verbose "[Dispatcher] Main script not found for $ExtensionName`: $MainScript" -Verbose
            continue
        }

        # 执行扩展（传递相同的stdin数据）
        try {
            Write-Verbose "[Dispatcher] Executing extension: $ExtensionName" -Verbose

            # 将stdin数据传递给扩展脚本
            if (![string]::IsNullOrWhiteSpace($inputData)) {
                $inputData | & $MainScript
            } else {
                & $MainScript
            }

            Write-Verbose "[Dispatcher] Extension '$ExtensionName' executed successfully" -Verbose

        } catch {
            Write-Verbose "[Dispatcher] Error executing $ExtensionName`: $($_.Exception.Message)" -Verbose
        }
    }

    Write-Verbose "[Dispatcher] === Claude Extensions Dispatcher Completed ===" -Verbose
    exit 0

} catch {
    Write-Verbose "[Dispatcher] FATAL ERROR: $($_.Exception.Message)" -Verbose
    exit 0
}
