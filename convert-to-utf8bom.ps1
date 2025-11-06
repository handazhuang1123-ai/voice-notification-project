# Convert all PowerShell scripts to UTF-8 with BOM
# Author: Zhuang Ba
# Date: 2025-01-06

$ErrorActionPreference = "Stop"

Write-Host "`n=== PowerShell Script Encoding Converter ===" -ForegroundColor Cyan
Write-Host "Converting all .ps1, .psm1, .psd1 files to UTF-8 with BOM`n" -ForegroundColor Yellow

# Get all PowerShell script files
$scriptFiles = Get-ChildItem -Path . -Include *.ps1, *.psm1, *.psd1 -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\\.git\\' }

$convertedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($file in $scriptFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path, ".")

    try {
        # Read file content (try UTF-8 first, fallback to default)
        $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue

        if ($null -eq $content) {
            Write-Host "  [SKIP] $relativePath (empty file)" -ForegroundColor Yellow
            $skippedCount++
            continue
        }

        # Create UTF-8 with BOM encoder
        $utf8Bom = New-Object System.Text.UTF8Encoding $true

        # Write back with BOM
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8Bom)

        Write-Host "  [OK] $relativePath" -ForegroundColor Green
        $convertedCount++

    } catch {
        Write-Host "  [ERROR] $relativePath - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n=== Conversion Summary ===" -ForegroundColor Cyan
Write-Host "Total files: $($scriptFiles.Count)" -ForegroundColor White
Write-Host "Converted: $convertedCount" -ForegroundColor Green
Write-Host "Skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red

if ($errorCount -eq 0) {
    Write-Host "`nAll files converted successfully!" -ForegroundColor Green
} else {
    Write-Host "`nSome files failed to convert. Please check the errors above." -ForegroundColor Red
    exit 1
}
