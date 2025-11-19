<#
.SYNOPSIS
    Start the Node.js-based Pip-Boy log viewer
    启动基于 Node.js 的 Pip-Boy 日志查看器

.DESCRIPTION
    One-click script to start the Node.js/TypeScript log viewer server.
    Automatically checks for Node.js installation, installs dependencies,
    compiles TypeScript code, and launches the server.
    一键启动 Node.js/TypeScript 日志查看器服务器。
    自动检查 Node.js 安装、安装依赖、编译 TypeScript 代码并启动服务器。

.PARAMETER SkipDependencyCheck
    Skip dependency installation check (faster startup if dependencies are already installed)
    跳过依赖安装检查（如果依赖已安装，启动更快）

.PARAMETER SkipBuild
    Skip TypeScript build step (use existing compiled code)
    跳过 TypeScript 构建步骤（使用现有编译代码）

.EXAMPLE
    .\Start-NodeLogViewer.ps1
    Start the log viewer with full checks
    启动日志查看器并进行完整检查

.EXAMPLE
    .\Start-NodeLogViewer.ps1 -SkipDependencyCheck -SkipBuild
    Quick start (skip all checks)
    快速启动（跳过所有检查）

.NOTES
    Author: 壮爸
    Version: 1.0
    Last Modified: 2025-01-20
    Requires: Node.js 18.0.0 or higher
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$SkipDependencyCheck,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild
)

try {
    Write-Information "=== Starting Node.js Pip-Boy Log Viewer ===" -InformationAction Continue

    # Get server directory | 获取服务器目录
    $ServerDir = Join-Path $PSScriptRoot "node-server"

    if (-not (Test-Path -Path $ServerDir)) {
        Write-Error "Server directory not found: $ServerDir"
        Write-Information "Please ensure the node-server directory exists." -InformationAction Continue
        exit 1
    }

    # Check if Node.js is installed | 检查 Node.js 是否安装
    Write-Information "`n[1/5] Checking Node.js installation..." -InformationAction Continue

    try {
        $NodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Node.js not found"
        }

        Write-Information "  ✓ Node.js version: $NodeVersion" -InformationAction Continue

        # Check Node.js version | 检查 Node.js 版本
        $VersionNumber = $NodeVersion -replace 'v', ''
        $MajorVersion = [int]($VersionNumber -split '\.')[0]

        if ($MajorVersion -lt 18) {
            Write-Warning "Node.js version 18.0.0 or higher is recommended (current: $NodeVersion)"
        }
    }
    catch {
        Write-Error "Node.js is not installed or not in PATH"
        Write-Information "`nPlease install Node.js 18.0.0 or higher from: https://nodejs.org" -InformationAction Continue
        Write-Information "After installation, restart your terminal and try again." -InformationAction Continue
        exit 1
    }

    # Check if npm is available | 检查 npm 是否可用
    try {
        $NpmVersion = npm --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "npm not found"
        }
        Write-Information "  ✓ npm version: $NpmVersion" -InformationAction Continue
    }
    catch {
        Write-Error "npm is not installed or not in PATH"
        exit 1
    }

    # Check and install dependencies | 检查并安装依赖
    if (-not $SkipDependencyCheck) {
        Write-Information "`n[2/5] Checking dependencies..." -InformationAction Continue

        $NodeModulesPath = Join-Path $ServerDir "node_modules"
        if (-not (Test-Path -Path $NodeModulesPath)) {
            Write-Information "  Dependencies not installed. Installing..." -InformationAction Continue

            Push-Location $ServerDir
            try {
                npm install
                if ($LASTEXITCODE -ne 0) {
                    throw "npm install failed"
                }
                Write-Information "  ✓ Dependencies installed successfully" -InformationAction Continue
            }
            catch {
                Write-Error "Failed to install dependencies: $_"
                exit 1
            }
            finally {
                Pop-Location
            }
        }
        else {
            Write-Information "  ✓ Dependencies already installed" -InformationAction Continue
        }
    }
    else {
        Write-Information "`n[SKIP] Dependency check skipped" -InformationAction Continue
    }

    # Build TypeScript code | 编译 TypeScript 代码
    if (-not $SkipBuild) {
        Write-Information "`n[3/5] Compiling TypeScript code..." -InformationAction Continue

        Push-Location $ServerDir
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) {
                throw "TypeScript build failed"
            }
            Write-Information "  ✓ TypeScript compiled successfully" -InformationAction Continue
        }
        catch {
            Write-Error "Failed to compile TypeScript: $_"
            Write-Information "Check the error messages above for details." -InformationAction Continue
            exit 1
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Information "`n[SKIP] TypeScript build skipped" -InformationAction Continue
    }

    # Verify compiled output exists | 验证编译输出存在
    $CompiledServerPath = Join-Path $ServerDir "dist\server.js"
    if (-not (Test-Path -Path $CompiledServerPath)) {
        Write-Error "Compiled server file not found: $CompiledServerPath"
        Write-Information "Please run without -SkipBuild to compile the TypeScript code." -InformationAction Continue
        exit 1
    }

    # Start the server | 启动服务器
    Write-Information "`n[4/5] Starting server..." -InformationAction Continue

    Push-Location $ServerDir
    try {
        # Run server with npm start
        # npm start will execute: node dist/server.js
        npm start
    }
    catch {
        Write-Error "Server failed to start: $_"
        exit 1
    }
    finally {
        Pop-Location
    }
}
catch {
    Write-Error "Failed to start log viewer: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
