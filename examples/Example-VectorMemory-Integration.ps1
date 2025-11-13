<#
.SYNOPSIS
    Example: VectorMemory integration with voice notification
    示例：VectorMemory 与语音通知集成

.DESCRIPTION
    Demonstrates how to integrate VectorMemory into voice notification workflow
    演示如何将 VectorMemory 集成到语音通知工作流

.EXAMPLE
    .\Example-VectorMemory-Integration.ps1
    Run integration example
    运行集成示例

.NOTES
    Author: 壮爸
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host "`n=== VectorMemory Integration Example ===" -ForegroundColor Cyan
Write-Host "集成示例" -ForegroundColor Cyan
Write-Host ""

# ==========================================
# 第1步：导入模块
# ==========================================
Write-Host "[Step 1] Importing VectorMemory module..." -ForegroundColor Yellow

$modulePath = Join-Path $PSScriptRoot '..\modules\VectorMemory.psm1'
if (-not (Test-Path $modulePath)) {
    Write-Host "✗ Module not found: $modulePath" -ForegroundColor Red
    exit 1
}

Import-Module $modulePath -Force
Write-Host "  ✓ Module imported" -ForegroundColor Green

# ==========================================
# 第2步：初始化记忆系统
# ==========================================
Write-Host "`n[Step 2] Initializing memory system..." -ForegroundColor Yellow

try {
    $connection = Initialize-VectorMemory
    Write-Host "  ✓ Memory system initialized" -ForegroundColor Green

    # 显示当前统计
    $stats = Get-MemoryStatistics -Connection $connection
    Write-Host "  Current stats: $($stats.TotalInteractions) interactions" -ForegroundColor Gray
}
catch {
    Write-Host "  ✗ Failed: $_" -ForegroundColor Red
    exit 1
}

# ==========================================
# 第3步：模拟用户交互
# ==========================================
Write-Host "`n[Step 3] Simulating user interactions..." -ForegroundColor Yellow

$simulatedInteractions = @(
    @{
        UserMessage  = "Git pull 完成"
        Context      = "代码更新"
        EmotionStyle = "calm"
    }
    @{
        UserMessage  = "单元测试全部通过"
        Context      = "测试成功"
        EmotionStyle = "celebrate"
    }
    @{
        UserMessage  = "构建失败，发现3个错误"
        Context      = "构建错误"
        EmotionStyle = "error"
    }
)

foreach ($interaction in $simulatedInteractions) {
    Write-Host "`n  Processing: $($interaction.UserMessage)" -ForegroundColor Cyan

    # 步骤3.1：生成自适应提示词
    Write-Host "    [3.1] Generating adaptive prompt..." -NoNewline
    $adaptivePrompt = Get-AdaptivePrompt `
        -Connection $connection `
        -CurrentMessage $interaction.UserMessage `
        -TopK 3

    $hasContext = $adaptivePrompt -match "历史相似场景"
    if ($hasContext) {
        Write-Host " ✓ (with context)" -ForegroundColor Green
    }
    else {
        Write-Host " ✓ (no context yet)" -ForegroundColor Yellow
    }

    # 步骤3.2：模拟调用 Ollama 生成总结
    Write-Host "    [3.2] Generating AI summary..." -NoNewline

    # 这里用简单的模板模拟（实际应调用 Ollama）
    $aiSummary = switch ($interaction.EmotionStyle) {
        'calm' { "壮爸，$($interaction.Context)已完成" }
        'celebrate' { "太棒了壮爸！$($interaction.Context)成功！" }
        'error' { "壮爸，注意：$($interaction.Context)" }
        default { "壮爸，任务已完成" }
    }

    Write-Host " ✓" -ForegroundColor Green
    Write-Host "      Summary: $aiSummary" -ForegroundColor Gray

    # 步骤3.3：保存记忆
    Write-Host "    [3.3] Saving memory..." -NoNewline
    $interactionId = Add-VectorMemory `
        -Connection $connection `
        -UserMessage $interaction.UserMessage `
        -AiSummary $aiSummary `
        -EmotionStyle $interaction.EmotionStyle

    Write-Host " ✓ (ID: $interactionId)" -ForegroundColor Green

    Start-Sleep -Milliseconds 500
}

# ==========================================
# 第4步：演示语义搜索
# ==========================================
Write-Host "`n[Step 4] Demonstrating semantic search..." -ForegroundColor Yellow

$searchQueries = @(
    "代码同步完成",
    "测试结果",
    "编译问题"
)

foreach ($query in $searchQueries) {
    Write-Host "`n  Query: '$query'" -ForegroundColor Cyan
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray

    $results = Find-SimilarMemories -Connection $connection -QueryText $query -TopK 2

    if ($results.Count -gt 0) {
        foreach ($result in $results) {
            $similarity = [math]::Round($result.Similarity, 3)
            Write-Host "    [$similarity] $($result.UserMessage)" -ForegroundColor Gray
            Write-Host "           └─ $($result.AiSummary)" -ForegroundColor DarkGray
        }
    }
    else {
        Write-Host "    No similar memories found" -ForegroundColor Yellow
    }
}

# ==========================================
# 第5步：显示最终统计
# ==========================================
Write-Host "`n[Step 5] Final statistics..." -ForegroundColor Yellow

$finalStats = Get-MemoryStatistics -Connection $connection

Write-Host "`n  Total Interactions: $($finalStats.TotalInteractions)" -ForegroundColor Gray
Write-Host "  Total Embeddings: $($finalStats.TotalEmbeddings)" -ForegroundColor Gray
Write-Host "  Emotion Types: $($finalStats.EmotionTypes)" -ForegroundColor Gray
Write-Host "  Most Used Emotion: $($finalStats.MostUsedEmotion)" -ForegroundColor Gray

# 显示情感分布
$emotionSql = "SELECT emotion_style, count FROM emotion_stats ORDER BY count DESC"
$command = $connection.CreateCommand()
$command.CommandText = $emotionSql
$reader = $command.ExecuteReader()

Write-Host "`n  Emotion Distribution:" -ForegroundColor Gray
while ($reader.Read()) {
    $emotion = $reader['emotion_style']
    $count = $reader['count']
    $bar = '#' * $count
    Write-Host "    $emotion`.PadRight(10) : $bar ($count)" -ForegroundColor DarkGray
}
$reader.Close()

# ==========================================
# 第6步：清理
# ==========================================
Write-Host "`n[Step 6] Cleanup..." -ForegroundColor Yellow

$connection.Close()
Write-Host "  ✓ Connection closed" -ForegroundColor Green

Write-Host "`n=== Integration Example Completed ===" -ForegroundColor Green
Write-Host "示例完成" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check memory database: .\data\memory.db" -ForegroundColor Yellow
Write-Host "2. Run full tests: .\tests\Test-VectorMemory.ps1" -ForegroundColor Yellow
Write-Host "3. Integrate into voice-notification.ps1" -ForegroundColor Yellow
