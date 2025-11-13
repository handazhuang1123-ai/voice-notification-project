<#
.SYNOPSIS
    Download and install SQLite dependencies for VectorMemory
    下载并安装 VectorMemory 所需的 SQLite 依赖

.DESCRIPTION
    This script downloads:
    1. System.Data.SQLite.dll from NuGet
    2. sqlite-vec extension (vec0.dll) from GitHub releases
    此脚本下载:
    1. 从 NuGet 下载 System.Data.SQLite.dll
    2. 从 GitHub releases 下载 sqlite-vec 扩展 (vec0.dll)

.EXAMPLE
    .\Install-Dependencies.ps1
    Download and install all dependencies
    下载并安装所有依赖

.NOTES
    Author: 壮爸
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$LibPath = Join-Path $ProjectRoot 'lib'

# 确保 lib 目录存在
if (-not (Test-Path $LibPath)) {
    New-Item -ItemType Directory -Path $LibPath -Force | Out-Null
    Write-Host "✓ Created lib directory" -ForegroundColor Green
}

Write-Host "`n=== SQLite Dependencies Installation ===" -ForegroundColor Cyan

# ==========================================
# 1. 下载 System.Data.SQLite
# ==========================================
Write-Host "`n[1/3] Downloading System.Data.SQLite..." -ForegroundColor Yellow

$sqliteVersion = "1.0.119"
$sqliteNuGetUrl = "https://www.nuget.org/api/v2/package/System.Data.SQLite.Core/$sqliteVersion"
$sqliteTempZip = Join-Path $env:TEMP "System.Data.SQLite.Core.nupkg"
$sqliteTempDir = Join-Path $env:TEMP "System.Data.SQLite.Core"

try {
    # 下载 NuGet 包
    Write-Host "  Downloading from NuGet..." -NoNewline
    Invoke-WebRequest -Uri $sqliteNuGetUrl -OutFile $sqliteTempZip -UseBasicParsing
    Write-Host " Done" -ForegroundColor Green

    # 解压 (NuGet包本质是ZIP，需要重命名)
    Write-Host "  Extracting package..." -NoNewline
    if (Test-Path $sqliteTempDir) {
        Remove-Item -Path $sqliteTempDir -Recurse -Force
    }
    # 重命名为 .zip 以便 Expand-Archive 识别
    $sqliteTempZipRenamed = $sqliteTempZip + ".zip"
    Copy-Item -Path $sqliteTempZip -Destination $sqliteTempZipRenamed -Force
    Expand-Archive -Path $sqliteTempZipRenamed -DestinationPath $sqliteTempDir -Force
    Remove-Item -Path $sqliteTempZipRenamed -Force -ErrorAction SilentlyContinue
    Write-Host " Done" -ForegroundColor Green

    # 复制 DLL 文件（x64版本）
    Write-Host "  Copying DLLs to lib folder..." -NoNewline
    $managedDll = Join-Path $sqliteTempDir "lib\net46\System.Data.SQLite.dll"
    $interopDll = Join-Path $sqliteTempDir "build\net46\x64\SQLite.Interop.dll"

    if (-not (Test-Path $managedDll)) {
        throw "System.Data.SQLite.dll not found in package"
    }

    Copy-Item -Path $managedDll -Destination $LibPath -Force

    # SQLite.Interop.dll 需要放在 x64 子目录
    $x64Path = Join-Path $LibPath 'x64'
    if (-not (Test-Path $x64Path)) {
        New-Item -ItemType Directory -Path $x64Path -Force | Out-Null
    }

    if (Test-Path $interopDll) {
        Copy-Item -Path $interopDll -Destination $x64Path -Force
    }
    else {
        Write-Warning "SQLite.Interop.dll not found, trying alternative location..."
        $interopDll2 = Join-Path $sqliteTempDir "runtimes\win-x64\native\netstandard2.0\SQLite.Interop.dll"
        if (Test-Path $interopDll2) {
            Copy-Item -Path $interopDll2 -Destination $x64Path -Force
        }
    }

    Write-Host " Done" -ForegroundColor Green
    Write-Host "  ✓ System.Data.SQLite.dll" -ForegroundColor Green
    Write-Host "  ✓ SQLite.Interop.dll (x64)" -ForegroundColor Green

    # 清理临时文件
    Remove-Item -Path $sqliteTempZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $sqliteTempDir -Recurse -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host " Failed" -ForegroundColor Red
    Write-Warning "Failed to download System.Data.SQLite: $_"
    Write-Host "You can manually download from: https://www.nuget.org/packages/System.Data.SQLite.Core/" -ForegroundColor Yellow
}

# ==========================================
# 2. 下载 sqlite-vec 扩展
# ==========================================
Write-Host "`n[2/3] Downloading sqlite-vec extension..." -ForegroundColor Yellow

$sqliteVecVersion = "v0.1.5"
$sqliteVecUrl = "https://github.com/asg017/sqlite-vec/releases/download/$sqliteVecVersion/sqlite-vec-$sqliteVecVersion-loadable-windows-x86_64.zip"
$sqliteVecTempZip = Join-Path $env:TEMP "sqlite-vec.zip"
$sqliteVecTempDir = Join-Path $env:TEMP "sqlite-vec"

try {
    # 下载
    Write-Host "  Downloading from GitHub..." -NoNewline
    Invoke-WebRequest -Uri $sqliteVecUrl -OutFile $sqliteVecTempZip -UseBasicParsing
    Write-Host " Done" -ForegroundColor Green

    # 解压
    Write-Host "  Extracting..." -NoNewline
    if (Test-Path $sqliteVecTempDir) {
        Remove-Item -Path $sqliteVecTempDir -Recurse -Force
    }
    Expand-Archive -Path $sqliteVecTempZip -DestinationPath $sqliteVecTempDir -Force
    Write-Host " Done" -ForegroundColor Green

    # 复制 DLL
    Write-Host "  Installing vec0.dll..." -NoNewline
    $vec0Dll = Get-ChildItem -Path $sqliteVecTempDir -Filter "vec0.dll" -Recurse | Select-Object -First 1
    if ($vec0Dll) {
        Copy-Item -Path $vec0Dll.FullName -Destination $LibPath -Force
        Write-Host " Done" -ForegroundColor Green
        Write-Host "  ✓ vec0.dll" -ForegroundColor Green
    }
    else {
        Write-Warning "vec0.dll not found in downloaded package"
    }

    # 清理临时文件
    Remove-Item -Path $sqliteVecTempZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $sqliteVecTempDir -Recurse -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host " Failed" -ForegroundColor Red
    Write-Warning "Failed to download sqlite-vec: $_"
    Write-Host "You can manually download from: https://github.com/asg017/sqlite-vec/releases" -ForegroundColor Yellow
}

# ==========================================
# 3. 验证安装
# ==========================================
Write-Host "`n[3/3] Verifying installation..." -ForegroundColor Yellow

$requiredFiles = @(
    @{ Path = "System.Data.SQLite.dll"; Required = $true }
    @{ Path = "x64\SQLite.Interop.dll"; Required = $true }
    @{ Path = "vec0.dll"; Required = $false }
)

$allOk = $true
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $LibPath $file.Path
    if (Test-Path $fullPath) {
        $fileSize = (Get-Item $fullPath).Length / 1KB
        Write-Host "  ✓ $($file.Path) ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    }
    else {
        if ($file.Required) {
            Write-Host "  ✗ $($file.Path) (MISSING - REQUIRED)" -ForegroundColor Red
            $allOk = $false
        }
        else {
            Write-Host "  ⚠ $($file.Path) (MISSING - Optional, vector search disabled)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== Installation Summary ===" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "✓ All required dependencies installed successfully!" -ForegroundColor Green
    Write-Host "`nNext step: Run tests\Initialize-MemoryDatabase.ps1" -ForegroundColor Cyan
}
else {
    Write-Host "✗ Some required dependencies are missing." -ForegroundColor Red
    Write-Host "Please download manually and place in: $LibPath" -ForegroundColor Yellow
}

Write-Host "`nInstallation directory: $LibPath" -ForegroundColor Gray
