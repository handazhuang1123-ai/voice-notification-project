<#
.SYNOPSIS
    Download and install SQLite dependencies using Microsoft.Data.Sqlite
    使用 Microsoft.Data.Sqlite 下载并安装 SQLite 依赖

.DESCRIPTION
    This script downloads Microsoft.Data.Sqlite which is simpler and more modern
    此脚本下载 Microsoft.Data.Sqlite，更简单且现代

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
}

Write-Host "`n=== Installing Microsoft.Data.Sqlite ===" -ForegroundColor Cyan

# NuGet packages 信息
$packages = @(
    @{
        Name    = "Microsoft.Data.Sqlite.Core"
        Version = "9.0.0"
        DllPath = "lib\net8.0\Microsoft.Data.Sqlite.dll"
    }
    @{
        Name    = "SQLitePCLRaw.core"
        Version = "2.1.10"
        DllPath = "lib\netstandard2.0\SQLitePCLRaw.core.dll"
    }
    @{
        Name    = "SQLitePCLRaw.bundle_e_sqlite3"
        Version = "2.1.10"
        DllPath = "lib\netstandard2.0\SQLitePCLRaw.bundle_e_sqlite3.dll"
    }
    @{
        Name    = "SQLitePCLRaw.provider.e_sqlite3"
        Version = "2.1.10"
        DllPath = "runtimes\win-x64\native\e_sqlite3.dll"
    }
)

foreach ($pkg in $packages) {
    Write-Host "`nDownloading $($pkg.Name) v$($pkg.Version)..." -ForegroundColor Yellow

    $url = "https://www.nuget.org/api/v2/package/$($pkg.Name)/$($pkg.Version)"
    $tempZip = Join-Path $env:TEMP "$($pkg.Name).nupkg"
    $tempDir = Join-Path $env:TEMP $pkg.Name

    try {
        # 下载
        Write-Host "  Downloading..." -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing
        Write-Host " Done" -ForegroundColor Green

        # 解压
        Write-Host "  Extracting..." -NoNewline
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
        # 重命名以支持 Expand-Archive
        $tempZipRenamed = "$tempZip.zip"
        Copy-Item -Path $tempZip -Destination $tempZipRenamed -Force
        Expand-Archive -Path $tempZipRenamed -DestinationPath $tempDir -Force
        Remove-Item -Path $tempZipRenamed -Force
        Write-Host " Done" -ForegroundColor Green

        # 复制 DLL
        Write-Host "  Installing DLL..." -NoNewline
        $sourceDll = Join-Path $tempDir $pkg.DllPath
        if (Test-Path $sourceDll) {
            $fileName = Split-Path -Leaf $sourceDll
            $destPath = Join-Path $LibPath $fileName
            Copy-Item -Path $sourceDll -Destination $destPath -Force
            Write-Host " Done ($fileName)" -ForegroundColor Green
        }
        else {
            Write-Warning "DLL not found at $sourceDll"
        }

        # 清理
        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host " Failed" -ForegroundColor Red
        Write-Warning "Error: $_"
    }
}

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
$dlls = Get-ChildItem -Path $LibPath -Filter "*.dll" -ErrorAction SilentlyContinue
if ($dlls) {
    foreach ($dll in $dlls) {
        $size = [math]::Round($dll.Length / 1KB, 2)
        Write-Host "  ✓ $($dll.Name) ($size KB)" -ForegroundColor Green
    }
}
else {
    Write-Host "  ✗ No DLLs found" -ForegroundColor Red
}

Write-Host "`nInstallation directory: $LibPath" -ForegroundColor Gray
Write-Host "Note: sqlite-vec extension needs manual installation from:" -ForegroundColor Yellow
Write-Host "  https://github.com/asg017/sqlite-vec/releases" -ForegroundColor Cyan
