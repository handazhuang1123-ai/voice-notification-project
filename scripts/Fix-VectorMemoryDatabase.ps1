<#
.SYNOPSIS
    Fix and rebuild vector memory database
    修复并重建向量记忆数据库

.DESCRIPTION
    This script fixes database issues by clearing corrupted embeddings and rebuilding them
    此脚本通过清除损坏的嵌入向量并重建它们来修复数据库问题

.EXAMPLE
    .\Fix-VectorMemoryDatabase.ps1
    Fix database with default settings
    使用默认设置修复数据库

.NOTES
    Author: 壮爸
#>

[CmdletBinding()]
param(
    [string]$DatabasePath = "$PSScriptRoot\..\data\memory.db",
    [switch]$RebuildAll
)

$ErrorActionPreference = 'Stop'

Write-Host "`n=== Vector Memory Database Fix Tool ===" -ForegroundColor Cyan
Write-Host "数据库修复工具" -ForegroundColor Cyan
Write-Host ""

# 检查数据库是否存在
if (-not (Test-Path $DatabasePath)) {
    Write-Host "✗ Database not found: $DatabasePath" -ForegroundColor Red
    Write-Host "Please run Initialize-MemoryDatabase.ps1 first" -ForegroundColor Yellow
    exit 1
}

# 导入模块
$modulePath = Join-Path $PSScriptRoot '..\modules\VectorMemory.psm1'
Import-Module $modulePath -Force
Write-Host "✓ Imported VectorMemory module" -ForegroundColor Green

# 备份数据库
Write-Host "`nBacking up database..." -NoNewline
$backupPath = "$DatabasePath.fix-backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item -Path $DatabasePath -Destination $backupPath -Force
Write-Host " Done" -ForegroundColor Green
Write-Host "  Backup saved to: $backupPath" -ForegroundColor Gray

try {
    # 连接数据库
    Write-Host "`nConnecting to database..." -NoNewline
    $connection = Initialize-VectorMemory -DatabasePath $DatabasePath
    Write-Host " Done" -ForegroundColor Green

    # 检查当前数据
    Write-Host "`n[1] Checking current data..." -ForegroundColor Yellow

    $checkSql = @"
SELECT
    (SELECT COUNT(*) FROM interactions) as interaction_count,
    (SELECT COUNT(*) FROM embeddings) as embedding_count,
    (SELECT COUNT(*) FROM embeddings WHERE LENGTH(embedding) % 4 != 0) as corrupted_count
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $checkSql
    $reader = $command.ExecuteReader()

    if ($reader.Read()) {
        $interactionCount = $reader['interaction_count']
        $embeddingCount = $reader['embedding_count']
        $corruptedCount = $reader['corrupted_count']

        Write-Host "  Interactions: $interactionCount" -ForegroundColor Gray
        Write-Host "  Embeddings: $embeddingCount" -ForegroundColor Gray
        Write-Host "  Corrupted: $corruptedCount" -ForegroundColor $(if ($corruptedCount -eq 0) { 'Green' } else { 'Red' })
    }
    $reader.Close()

    # 清理损坏的嵌入向量
    if ($corruptedCount -gt 0 -or $RebuildAll) {
        Write-Host "`n[2] Cleaning embeddings..." -ForegroundColor Yellow

        $deleteSql = "DELETE FROM embeddings"
        $command = $connection.CreateCommand()
        $command.CommandText = $deleteSql
        $deletedRows = $command.ExecuteNonQuery()

        Write-Host "  ✓ Cleared $deletedRows embeddings" -ForegroundColor Green
    }

    # 重建嵌入向量
    Write-Host "`n[3] Rebuilding embeddings..." -ForegroundColor Yellow

    $selectInteractionsSql = @"
SELECT id, user_message, ai_summary
FROM interactions
WHERE id NOT IN (SELECT interaction_id FROM embeddings)
ORDER BY id
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $selectInteractionsSql
    $reader = $command.ExecuteReader()

    $interactions = @()
    while ($reader.Read()) {
        $interactions += @{
            Id = $reader['id']
            UserMessage = $reader['user_message']
            AiSummary = $reader['ai_summary']
        }
    }
    $reader.Close()

    Write-Host "  Found $($interactions.Count) interactions needing embeddings" -ForegroundColor Gray

    $successCount = 0
    $failCount = 0

    foreach ($interaction in $interactions) {
        Write-Host "  Processing ID $($interaction.Id): " -NoNewline

        try {
            # 生成嵌入向量
            $combinedText = "$($interaction.UserMessage)`n$($interaction.AiSummary)"
            $embedding = Get-OllamaEmbedding -Text $combinedText

            if ($embedding -and $embedding.Count -eq 768) {
                # 正确转换为二进制
                $binaryStream = New-Object System.IO.MemoryStream
                foreach ($value in $embedding) {
                    $bytes = [System.BitConverter]::GetBytes([float]$value)
                    $binaryStream.Write($bytes, 0, $bytes.Length)
                }
                $blobData = $binaryStream.ToArray()
                $binaryStream.Close()

                # 插入到数据库
                $insertSql = 'INSERT INTO embeddings (interaction_id, embedding, dimension) VALUES (@id, @vec, @dim)'
                $insertCommand = $connection.CreateCommand()
                $insertCommand.CommandText = $insertSql
                $insertCommand.Parameters.AddWithValue('@id', $interaction.Id) | Out-Null
                $insertCommand.Parameters.AddWithValue('@vec', $blobData) | Out-Null
                $insertCommand.Parameters.AddWithValue('@dim', 768) | Out-Null

                $insertCommand.ExecuteNonQuery() | Out-Null

                Write-Host "✓" -ForegroundColor Green
                $successCount++
            }
            else {
                Write-Host "✗ (invalid embedding)" -ForegroundColor Red
                $failCount++
            }
        }
        catch {
            Write-Host "✗ ($_)" -ForegroundColor Red
            $failCount++
        }
    }

    Write-Host "`n  Summary: $successCount succeeded, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { 'Green' } else { 'Yellow' })

    # 验证修复结果
    Write-Host "`n[4] Verifying fix..." -ForegroundColor Yellow

    # 重新检查数据
    $command = $connection.CreateCommand()
    $command.CommandText = $checkSql
    $reader = $command.ExecuteReader()

    if ($reader.Read()) {
        $newEmbeddingCount = $reader['embedding_count']
        $newCorruptedCount = $reader['corrupted_count']

        Write-Host "  New embedding count: $newEmbeddingCount" -ForegroundColor Gray
        Write-Host "  Corrupted count: $newCorruptedCount" -ForegroundColor $(if ($newCorruptedCount -eq 0) { 'Green' } else { 'Red' })
    }
    $reader.Close()

    # 测试搜索功能
    Write-Host "`n[5] Testing search function..." -ForegroundColor Yellow

    try {
        $testResults = Find-SimilarMemories -Connection $connection -QueryText "测试搜索" -TopK 2
        Write-Host "  ✓ Search function working (found $($testResults.Count) results)" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Search still failing: $_" -ForegroundColor Red
    }

    # 关闭连接
    $connection.Close()

    Write-Host "`n✓ Database fix completed!" -ForegroundColor Green
    Write-Host "  Database location: $DatabasePath" -ForegroundColor Gray
}
catch {
    Write-Host "`n✗ Fix failed: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Run the integration example again: .\examples\Example-VectorMemory-Integration.ps1" -ForegroundColor Yellow
Write-Host "2. Run tests: .\tests\Test-VectorMemory.ps1" -ForegroundColor Yellow