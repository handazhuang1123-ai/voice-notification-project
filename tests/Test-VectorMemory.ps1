<#
.SYNOPSIS
    Test VectorMemory module functionality
    测试 VectorMemory 模块功能

.DESCRIPTION
    Comprehensive test suite for vector memory system including:
    - Database initialization
    - Memory storage
    - Embedding generation
    - Semantic search
    - Adaptive prompt generation
    向量记忆系统的综合测试套件，包括：
    - 数据库初始化
    - 记忆存储
    - 嵌入向量生成
    - 语义搜索
    - 自适应提示词生成

.EXAMPLE
    .\Test-VectorMemory.ps1
    Run all tests
    运行所有测试

.NOTES
    Author: 壮爸
#>

[CmdletBinding()]
param(
    [switch]$KeepDatabase
)

$ErrorActionPreference = 'Stop'

# 测试配置
$script:TestDbPath = Join-Path $PSScriptRoot '..\data\memory.test.db'
$script:PassedTests = 0
$script:FailedTests = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ''
    )

    if ($Passed) {
        Write-Host "  ✓ $TestName" -ForegroundColor Green
        if ($Message) {
            Write-Host "    $Message" -ForegroundColor Gray
        }
        $script:PassedTests++
    }
    else {
        Write-Host "  ✗ $TestName" -ForegroundColor Red
        if ($Message) {
            Write-Host "    Error: $Message" -ForegroundColor Red
        }
        $script:FailedTests++
    }
}

Write-Host "`n=== VectorMemory Module Test Suite ===" -ForegroundColor Cyan
Write-Host "测试套件" -ForegroundColor Cyan
Write-Host ""

# 清理旧测试数据库
if (Test-Path $script:TestDbPath) {
    Remove-Item -Path $script:TestDbPath -Force
    Write-Host "Cleaned up old test database" -ForegroundColor Gray
}

# 导入模块
try {
    $modulePath = Join-Path $PSScriptRoot '..\modules\VectorMemory.psm1'
    Import-Module $modulePath -Force
    Write-Host "✓ Imported VectorMemory module`n" -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed to import module: $_" -ForegroundColor Red
    exit 1
}

#region Test 1: Database Initialization

Write-Host "[Test 1] Database Initialization" -ForegroundColor Yellow

try {
    $connection = Initialize-VectorMemory -DatabasePath $script:TestDbPath
    Write-TestResult -TestName "Initialize database" -Passed ($null -ne $connection) -Message "Connection established"

    # 验证表存在
    $tables = @('interactions', 'embeddings', 'preferences', 'emotion_stats')
    $allTablesExist = $true

    foreach ($table in $tables) {
        $checkSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='$table'"
        $command = $connection.CreateCommand()
        $command.CommandText = $checkSql
        $result = $command.ExecuteScalar()

        if ($result) {
            Write-TestResult -TestName "Table '$table' exists" -Passed $true
        }
        else {
            Write-TestResult -TestName "Table '$table' exists" -Passed $false
            $allTablesExist = $false
        }
    }
}
catch {
    Write-TestResult -TestName "Initialize database" -Passed $false -Message $_
    exit 1
}

#endregion

#region Test 2: Ollama Embedding Generation

Write-Host "`n[Test 2] Ollama Embedding Generation" -ForegroundColor Yellow

try {
    $testText = "创建用户手册"
    $embedding = Get-OllamaEmbedding -Text $testText

    Write-TestResult -TestName "Generate embedding" -Passed ($null -ne $embedding) -Message "Generated $($embedding.Count) dimensions"

    if ($embedding) {
        Write-TestResult -TestName "Embedding dimension" -Passed ($embedding.Count -eq 768) -Message "$($embedding.Count) dimensions"
        Write-TestResult -TestName "Embedding values" -Passed ($embedding[0] -is [float]) -Message "Type: $($embedding[0].GetType().Name)"
    }
}
catch {
    Write-TestResult -TestName "Generate embedding" -Passed $false -Message $_
}

#endregion

#region Test 3: Memory Storage

Write-Host "`n[Test 3] Memory Storage" -ForegroundColor Yellow

try {
    $testInteractions = @(
        @{ UserMessage = "创建用户手册"; AiSummary = "壮爸，用户手册已创建完成"; EmotionStyle = "calm" }
        @{ UserMessage = "修复登录错误"; AiSummary = "壮爸，登录问题已修复"; EmotionStyle = "celebrate" }
        @{ UserMessage = "优化数据库性能"; AiSummary = "壮爸，数据库性能已优化"; EmotionStyle = "calm" }
        @{ UserMessage = "编写API文档"; AiSummary = "壮爸，API文档已完成"; EmotionStyle = "calm" }
    )

    $storedIds = @()
    foreach ($interaction in $testInteractions) {
        $id = Add-VectorMemory -Connection $connection `
            -UserMessage $interaction.UserMessage `
            -AiSummary $interaction.AiSummary `
            -EmotionStyle $interaction.EmotionStyle

        $storedIds += $id
        Write-TestResult -TestName "Store interaction ID $id" -Passed ($id -gt 0) -Message $interaction.UserMessage
    }

    # 验证存储的数量
    $countSql = "SELECT COUNT(*) FROM interactions"
    $command = $connection.CreateCommand()
    $command.CommandText = $countSql
    $count = [int]$command.ExecuteScalar()

    Write-TestResult -TestName "Total interactions stored" -Passed ($count -eq $testInteractions.Count) -Message "$count interactions"

    # 验证嵌入向量
    $embCountSql = "SELECT COUNT(*) FROM embeddings"
    $embCommand = $connection.CreateCommand()
    $embCommand.CommandText = $embCountSql
    $embCount = [int]$embCommand.ExecuteScalar()

    Write-TestResult -TestName "Total embeddings stored" -Passed ($embCount -eq $testInteractions.Count) -Message "$embCount embeddings"
}
catch {
    Write-TestResult -TestName "Store memories" -Passed $false -Message $_
}

#endregion

#region Test 4: Semantic Search

Write-Host "`n[Test 4] Semantic Search" -ForegroundColor Yellow

try {
    # 测试1：搜索"文档"相关内容（应该找到"创建用户手册"和"编写API文档"）
    $query1 = "如何生成文档"
    $results1 = Find-SimilarMemories -Connection $connection -QueryText $query1 -TopK 3

    Write-TestResult -TestName "Search for '$query1'" -Passed ($results1.Count -gt 0) -Message "Found $($results1.Count) results"

    if ($results1.Count -gt 0) {
        $topResult = $results1[0]
        Write-Host "    Top result: '$($topResult.UserMessage)' (similarity: $([math]::Round($topResult.Similarity, 3)))" -ForegroundColor Gray

        # 验证语义相关性
        $isRelevant = $topResult.UserMessage -match "(文档|手册|API)" -or $topResult.Similarity -gt 0.5
        Write-TestResult -TestName "Result relevance" -Passed $isRelevant -Message "Similarity: $([math]::Round($topResult.Similarity, 3))"
    }

    # 测试2：搜索"错误"相关内容
    $query2 = "解决bug"
    $results2 = Find-SimilarMemories -Connection $connection -QueryText $query2 -TopK 2

    Write-TestResult -TestName "Search for '$query2'" -Passed ($results2.Count -gt 0) -Message "Found $($results2.Count) results"

    if ($results2.Count -gt 0) {
        $topResult = $results2[0]
        Write-Host "    Top result: '$($topResult.UserMessage)' (similarity: $([math]::Round($topResult.Similarity, 3)))" -ForegroundColor Gray
    }

    # 测试3：搜索"性能"相关内容
    $query3 = "提升系统速度"
    $results3 = Find-SimilarMemories -Connection $connection -QueryText $query3 -TopK 2

    Write-TestResult -TestName "Search for '$query3'" -Passed ($results3.Count -gt 0) -Message "Found $($results3.Count) results"

    if ($results3.Count -gt 0) {
        $topResult = $results3[0]
        Write-Host "    Top result: '$($topResult.UserMessage)' (similarity: $([math]::Round($topResult.Similarity, 3)))" -ForegroundColor Gray
    }
}
catch {
    Write-TestResult -TestName "Semantic search" -Passed $false -Message $_
}

#endregion

#region Test 5: Adaptive Prompt Generation

Write-Host "`n[Test 5] Adaptive Prompt Generation" -ForegroundColor Yellow

try {
    $currentMessage = "更新开发者指南"
    $adaptivePrompt = Get-AdaptivePrompt -Connection $connection -CurrentMessage $currentMessage -TopK 3

    Write-TestResult -TestName "Generate adaptive prompt" -Passed ($null -ne $adaptivePrompt) -Message "Prompt length: $($adaptivePrompt.Length) chars"

    # 验证提示词包含关键元素
    $hasContext = $adaptivePrompt -match "历史相似场景"
    $hasPreference = $adaptivePrompt -match "用户偏好"
    $hasCurrentMessage = $adaptivePrompt -match $currentMessage

    Write-TestResult -TestName "Prompt includes historical context" -Passed $hasContext
    Write-TestResult -TestName "Prompt includes preferences" -Passed $hasPreference
    Write-TestResult -TestName "Prompt includes current message" -Passed $hasCurrentMessage

    if ($adaptivePrompt.Length -lt 500) {
        Write-Host "`n    Generated Prompt Preview:" -ForegroundColor Gray
        Write-Host "    ----------------------------------------" -ForegroundColor DarkGray
        Write-Host "    $($adaptivePrompt.Substring(0, [Math]::Min(300, $adaptivePrompt.Length)))..." -ForegroundColor DarkGray
        Write-Host "    ----------------------------------------" -ForegroundColor DarkGray
    }
}
catch {
    Write-TestResult -TestName "Generate adaptive prompt" -Passed $false -Message $_
}

#endregion

#region Test 6: Statistics

Write-Host "`n[Test 6] Memory Statistics" -ForegroundColor Yellow

try {
    $stats = Get-MemoryStatistics -Connection $connection

    Write-TestResult -TestName "Get statistics" -Passed ($null -ne $stats) -Message "Stats retrieved"

    if ($stats) {
        Write-Host "    Total Interactions: $($stats.TotalInteractions)" -ForegroundColor Gray
        Write-Host "    Total Embeddings: $($stats.TotalEmbeddings)" -ForegroundColor Gray
        Write-Host "    Emotion Types: $($stats.EmotionTypes)" -ForegroundColor Gray
        Write-Host "    Most Used Emotion: $($stats.MostUsedEmotion)" -ForegroundColor Gray

        Write-TestResult -TestName "Statistics accuracy" -Passed ($stats.TotalInteractions -ge 4)
    }
}
catch {
    Write-TestResult -TestName "Get statistics" -Passed $false -Message $_
}

#endregion

#region Test 7: Cosine Similarity Calculation

Write-Host "`n[Test 7] Cosine Similarity Calculation" -ForegroundColor Yellow

try {
    # 相同向量（相似度应该是 1.0）
    $vec1 = @(1.0, 2.0, 3.0, 4.0)
    $vec2 = @(1.0, 2.0, 3.0, 4.0)
    $similarity1 = Get-CosineSimilarity -Vector1 $vec1 -Vector2 $vec2

    Write-TestResult -TestName "Identical vectors similarity" -Passed ([Math]::Abs($similarity1 - 1.0) -lt 0.001) -Message "Similarity: $([math]::Round($similarity1, 3))"

    # 正交向量（相似度应该是 0.0）
    $vec3 = @(1.0, 0.0, 0.0, 0.0)
    $vec4 = @(0.0, 1.0, 0.0, 0.0)
    $similarity2 = Get-CosineSimilarity -Vector1 $vec3 -Vector2 $vec4

    Write-TestResult -TestName "Orthogonal vectors similarity" -Passed ([Math]::Abs($similarity2) -lt 0.001) -Message "Similarity: $([math]::Round($similarity2, 3))"

    # 相反向量（相似度应该是 -1.0）
    $vec5 = @(1.0, 2.0, 3.0, 4.0)
    $vec6 = @(-1.0, -2.0, -3.0, -4.0)
    $similarity3 = Get-CosineSimilarity -Vector1 $vec5 -Vector2 $vec6

    Write-TestResult -TestName "Opposite vectors similarity" -Passed ([Math]::Abs($similarity3 + 1.0) -lt 0.001) -Message "Similarity: $([math]::Round($similarity3, 3))"
}
catch {
    Write-TestResult -TestName "Cosine similarity" -Passed $false -Message $_
}

#endregion

# 关闭连接
if ($connection) {
    $connection.Close()
    Write-Host "`n✓ Database connection closed" -ForegroundColor Green
}

# 清理测试数据库
if (-not $KeepDatabase) {
    if (Test-Path $script:TestDbPath) {
        Remove-Item -Path $script:TestDbPath -Force
        Write-Host "✓ Test database cleaned up" -ForegroundColor Green
    }
}
else {
    Write-Host "⚠ Test database kept at: $script:TestDbPath" -ForegroundColor Yellow
}

# 测试总结
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "测试总结" -ForegroundColor Cyan
Write-Host ""

$totalTests = $script:PassedTests + $script:FailedTests
$passRate = if ($totalTests -gt 0) { [math]::Round(($script:PassedTests / $totalTests) * 100, 1) } else { 0 }

Write-Host "Total Tests: $totalTests" -ForegroundColor Gray
Write-Host "Passed: $script:PassedTests" -ForegroundColor Green
Write-Host "Failed: $script:FailedTests" -ForegroundColor $(if ($script:FailedTests -eq 0) { 'Green' } else { 'Red' })
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { 'Green' } elseif ($passRate -ge 70) { 'Yellow' } else { 'Red' })

if ($script:FailedTests -eq 0) {
    Write-Host "`n✓ All tests passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n✗ Some tests failed" -ForegroundColor Red
    exit 1
}
