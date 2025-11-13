<#
.SYNOPSIS
    Initialize vector memory database
    初始化向量记忆数据库

.DESCRIPTION
    Creates and initializes the SQLite database for vector memory system.
    为向量记忆系统创建并初始化 SQLite 数据库。

.EXAMPLE
    .\Initialize-MemoryDatabase.ps1
    Initialize database with default settings
    使用默认设置初始化数据库

.EXAMPLE
    .\Initialize-MemoryDatabase.ps1 -DatabasePath "custom\path\memory.db"
    Initialize database at custom location
    在自定义位置初始化数据库

.NOTES
    Author: 壮爸
#>

[CmdletBinding()]
param(
    [string]$DatabasePath = "$PSScriptRoot\..\data\memory.db",
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "`n=== Vector Memory Database Initialization ===" -ForegroundColor Cyan
Write-Host "数据库初始化" -ForegroundColor Cyan

# 检查数据库是否已存在
if ((Test-Path $DatabasePath) -and -not $Force) {
    Write-Host "`n⚠ Database already exists at: $DatabasePath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Initialization cancelled." -ForegroundColor Gray
        return
    }

    Write-Host "Backing up existing database..." -NoNewline
    $backupPath = "$DatabasePath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item -Path $DatabasePath -Destination $backupPath -Force
    Write-Host " Done" -ForegroundColor Green
    Write-Host "  Backup saved to: $backupPath" -ForegroundColor Gray

    Remove-Item -Path $DatabasePath -Force
}

# 导入 VectorMemory 模块
$modulePath = Join-Path $PSScriptRoot '..\modules\VectorMemory.psm1'
if (-not (Test-Path $modulePath)) {
    Write-Host "✗ VectorMemory module not found: $modulePath" -ForegroundColor Red
    exit 1
}

Import-Module $modulePath -Force
Write-Host "✓ Imported VectorMemory module" -ForegroundColor Green

# 初始化数据库
try {
    Write-Host "`nInitializing database..." -NoNewline
    $connection = Initialize-VectorMemory -DatabasePath $DatabasePath
    Write-Host " Done" -ForegroundColor Green

    # 验证数据库
    Write-Host "`nVerifying database structure..." -NoNewline

    $tables = @('interactions', 'embeddings', 'preferences', 'emotion_stats')
    $allTablesExist = $true

    foreach ($table in $tables) {
        $checkSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='$table'"
        $command = $connection.CreateCommand()
        $command.CommandText = $checkSql
        $result = $command.ExecuteScalar()

        if ($result) {
            Write-Host "`n  ✓ Table '$table' created" -ForegroundColor Green
        }
        else {
            Write-Host "`n  ✗ Table '$table' missing" -ForegroundColor Red
            $allTablesExist = $false
        }
    }

    if ($allTablesExist) {
        Write-Host "`n✓ All tables created successfully" -ForegroundColor Green
    }
    else {
        Write-Host "`n✗ Some tables are missing" -ForegroundColor Red
        $connection.Close()
        exit 1
    }

    # 添加示例数据（可选）
    Write-Host "`nDo you want to add sample data for testing? (y/N): " -NoNewline
    $addSamples = Read-Host

    if ($addSamples -eq 'y' -or $addSamples -eq 'Y') {
        Write-Host "`nAdding sample interactions..." -ForegroundColor Yellow

        $samples = @(
            @{
                UserMessage  = "创建用户手册"
                AiSummary    = "壮爸，用户手册已创建完成"
                EmotionStyle = "calm"
            }
            @{
                UserMessage  = "修复登录错误"
                AiSummary    = "壮爸，登录问题已修复"
                EmotionStyle = "celebrate"
            }
            @{
                UserMessage  = "优化数据库查询性能"
                AiSummary    = "壮爸，数据库查询性能已优化，速度提升40%"
                EmotionStyle = "calm"
            }
        )

        foreach ($sample in $samples) {
            try {
                $id = Add-VectorMemory -Connection $connection `
                    -UserMessage $sample.UserMessage `
                    -AiSummary $sample.AiSummary `
                    -EmotionStyle $sample.EmotionStyle

                Write-Host "  ✓ Added sample #$id : $($sample.UserMessage)" -ForegroundColor Green
            }
            catch {
                Write-Host "  ✗ Failed to add sample: $_" -ForegroundColor Red
            }
        }
    }

    # 显示统计信息
    Write-Host "`n=== Database Statistics ===" -ForegroundColor Cyan
    $stats = Get-MemoryStatistics -Connection $connection

    Write-Host "  Total Interactions: $($stats.TotalInteractions)" -ForegroundColor Gray
    Write-Host "  Total Embeddings: $($stats.TotalEmbeddings)" -ForegroundColor Gray
    Write-Host "  Emotion Types: $($stats.EmotionTypes)" -ForegroundColor Gray
    if ($stats.MostUsedEmotion) {
        Write-Host "  Most Used Emotion: $($stats.MostUsedEmotion)" -ForegroundColor Gray
    }

    # 关闭连接
    $connection.Close()
    Write-Host "`n✓ Database initialization completed successfully!" -ForegroundColor Green
    Write-Host "  Database location: $DatabasePath" -ForegroundColor Gray

    # 文件大小
    $dbSize = (Get-Item $DatabasePath).Length / 1KB
    Write-Host "  Database size: $([math]::Round($dbSize, 2)) KB" -ForegroundColor Gray
}
catch {
    Write-Host " Failed" -ForegroundColor Red
    Write-Host "`n✗ Error: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Run tests: .\tests\Test-VectorMemory.ps1" -ForegroundColor Yellow
Write-Host "2. Integrate into voice notification system" -ForegroundColor Yellow
Write-Host "3. Monitor memory.db growth over time" -ForegroundColor Yellow
