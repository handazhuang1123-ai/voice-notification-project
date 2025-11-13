<#
.SYNOPSIS
    Vector Memory Module - SQLite + sqlite-vec based memory system
    向量记忆模块 - 基于 SQLite + sqlite-vec 的记忆系统

.DESCRIPTION
    This module provides vector-based memory storage and semantic search
    using SQLite database with sqlite-vec extension and Ollama embeddings.
    本模块使用 SQLite 数据库配合 sqlite-vec 扩展和 Ollama 嵌入
    提供基于向量的记忆存储和语义搜索功能。

.NOTES
    Author: 壮爸
    Dependencies:
    - System.Data.SQLite.dll (in lib/)
    - vec0.dll (sqlite-vec extension, in lib/)
    - Ollama with nomic-embed-text model
#>

# 模块变量
$script:LibPath = Join-Path $PSScriptRoot '..\lib'
$script:DataPath = Join-Path $PSScriptRoot '..\data'
$script:OllamaApiUrl = 'http://localhost:11434'

#region Helper Functions

function Write-MemoryLog {
    <#
    .SYNOPSIS
        Write log message for VectorMemory module
        为 VectorMemory 模块写入日志消息
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [ValidateSet('Info', 'Warning', 'Error', 'Debug')]
        [string]$Level = 'Info'
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] [$Level] $Message"

    switch ($Level) {
        'Warning' { Write-Warning $Message }
        'Error' { Write-Error $Message }
        'Debug' { Write-Verbose $Message }
        default { Write-Verbose $Message }
    }
}

#endregion

#region Database Initialization

function Initialize-VectorMemory {
    <#
    .SYNOPSIS
        Initialize SQLite vector memory database
        初始化 SQLite 向量记忆数据库

    .DESCRIPTION
        Creates and initializes the SQLite database with vec0 extension,
        sets up tables for interactions, embeddings, and preferences.
        创建并初始化带 vec0 扩展的 SQLite 数据库，
        设置交互、嵌入和偏好的数据表。

    .PARAMETER DatabasePath
        Path to SQLite database file
        SQLite 数据库文件路径

    .EXAMPLE
        $conn = Initialize-VectorMemory
        Initialize database and return connection
        初始化数据库并返回连接

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [string]$DatabasePath = (Join-Path $script:DataPath 'memory.db')
    )

    try {
        # 确保 data 目录存在
        $dataDir = Split-Path -Parent $DatabasePath
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
            Write-MemoryLog "Created data directory: $dataDir" -Level Info
        }

        # 加载 System.Data.SQLite
        $sqliteDll = Join-Path $script:LibPath 'System.Data.SQLite.dll'
        if (-not (Test-Path $sqliteDll)) {
            throw "System.Data.SQLite.dll not found at: $sqliteDll"
        }

        Add-Type -Path $sqliteDll
        Write-MemoryLog "Loaded System.Data.SQLite" -Level Debug

        # 创建数据库连接
        $connectionString = "Data Source=$DatabasePath;Version=3;Journal Mode=WAL;"
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()

        Write-MemoryLog "Database connection opened: $DatabasePath" -Level Info

        # 尝试加载 sqlite-vec 扩展
        $vec0Dll = Join-Path $script:LibPath 'vec0.dll'
        if (Test-Path $vec0Dll) {
            try {
                $connection.LoadExtension($vec0Dll)
                Write-MemoryLog "Loaded sqlite-vec extension" -Level Info
            }
            catch {
                Write-MemoryLog "Failed to load vec0.dll: $_" -Level Warning
                Write-MemoryLog "Vector search will be disabled" -Level Warning
            }
        }
        else {
            Write-MemoryLog "vec0.dll not found, vector search disabled" -Level Warning
        }

        # 创建数据表
        Initialize-DatabaseSchema -Connection $connection

        return $connection
    }
    catch {
        Write-MemoryLog "Failed to initialize database: $_" -Level Error
        throw
    }
}

function Initialize-DatabaseSchema {
    <#
    .SYNOPSIS
        Create database schema (tables)
        创建数据库架构（数据表）

    .PARAMETER Connection
        SQLite connection object
        SQLite 连接对象

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection
    )

    $schema = @"
-- Interactions table | 交互记录表
CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_message TEXT NOT NULL,
    ai_summary TEXT,
    emotion_style TEXT,
    success INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings table (stores vectors) | 嵌入向量表
CREATE TABLE IF NOT EXISTS embeddings (
    interaction_id INTEGER PRIMARY KEY,
    embedding BLOB NOT NULL,
    dimension INTEGER DEFAULT 768,
    model TEXT DEFAULT 'nomic-embed-text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
);

-- Preferences table | 偏好设置表
CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT,
    frequency INTEGER DEFAULT 1,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emotion statistics | 情感统计表
CREATE TABLE IF NOT EXISTS emotion_stats (
    emotion_style TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    avg_success_rate REAL DEFAULT 1.0,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance | 性能索引
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_stats_count ON emotion_stats(count DESC);
"@

    $command = $Connection.CreateCommand()
    $command.CommandText = $schema
    $command.ExecuteNonQuery() | Out-Null

    Write-MemoryLog "Database schema initialized" -Level Info
}

#endregion

#region Ollama Embedding Functions

function Get-OllamaEmbedding {
    <#
    .SYNOPSIS
        Generate embedding vector using Ollama nomic-embed-text
        使用 Ollama nomic-embed-text 生成嵌入向量

    .DESCRIPTION
        Calls Ollama API to generate 768-dimensional embedding vector
        调用 Ollama API 生成 768 维嵌入向量

    .PARAMETER Text
        Text to embed
        要嵌入的文本

    .PARAMETER Model
        Embedding model name
        嵌入模型名称

    .EXAMPLE
        $vector = Get-OllamaEmbedding -Text "创建用户手册"
        Generate embedding for text
        为文本生成嵌入向量

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [string]$Model = 'nomic-embed-text'
    )

    try {
        $body = @{
            model  = $Model
            prompt = $Text
        } | ConvertTo-Json -Compress

        $response = Invoke-RestMethod -Uri "$script:OllamaApiUrl/api/embeddings" `
            -Method Post `
            -Body $body `
            -ContentType 'application/json' `
            -TimeoutSec 10

        if ($response.embedding -and $response.embedding.Count -gt 0) {
            Write-MemoryLog "Generated embedding: $($response.embedding.Count) dimensions" -Level Debug
            return $response.embedding
        }
        else {
            Write-MemoryLog "Ollama returned empty embedding" -Level Warning
            return $null
        }
    }
    catch {
        Write-MemoryLog "Failed to generate embedding: $_" -Level Error
        return $null
    }
}

function ConvertTo-EmbeddingBlob {
    <#
    .SYNOPSIS
        Convert float array to binary blob for SQLite storage
        将浮点数组转换为二进制 blob 以存储到 SQLite

    .PARAMETER Vector
        Float array (embedding vector)
        浮点数组（嵌入向量）

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [float[]]$Vector
    )

    $binaryWriter = New-Object System.IO.MemoryStream
    foreach ($value in $Vector) {
        $bytes = [System.BitConverter]::GetBytes([float]$value)
        $binaryWriter.Write($bytes, 0, $bytes.Length)
    }

    return $binaryWriter.ToArray()
}

function ConvertFrom-EmbeddingBlob {
    <#
    .SYNOPSIS
        Convert binary blob back to float array
        将二进制 blob 转换回浮点数组

    .PARAMETER Blob
        Binary data from database
        数据库中的二进制数据

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$Blob
    )

    # 检查 Blob 长度是否是 4 的倍数
    if ($Blob.Length % 4 -ne 0) {
        Write-Warning "Blob length ($($Blob.Length)) is not divisible by 4, data may be corrupted"
        return @()
    }

    $floatArray = @()
    $offset = 0

    while ($offset + 3 -lt $Blob.Length) {
        try {
            # 确保有足够的字节
            if ($offset + 4 -le $Blob.Length) {
                $floatArray += [System.BitConverter]::ToSingle($Blob, $offset)
            }
            $offset += 4
        }
        catch {
            Write-Warning "Error converting bytes at offset ${offset}: $_"
            break
        }
    }

    return $floatArray
}

#endregion

#region Memory Storage Functions

function Add-VectorMemory {
    <#
    .SYNOPSIS
        Save interaction with embedding to database
        保存交互记录及其嵌入向量到数据库

    .DESCRIPTION
        Stores user message, AI summary, and generates embedding vector
        存储用户消息、AI 总结，并生成嵌入向量

    .PARAMETER Connection
        SQLite connection object
        SQLite 连接对象

    .PARAMETER UserMessage
        User's message or command
        用户的消息或命令

    .PARAMETER AiSummary
        AI generated summary
        AI 生成的总结

    .PARAMETER EmotionStyle
        Emotion style used
        使用的情感风格

    .EXAMPLE
        Add-VectorMemory -Connection $conn -UserMessage "创建文档" -AiSummary "文档已创建完成" -EmotionStyle "calm"
        Save interaction with embedding
        保存交互记录及嵌入

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [string]$AiSummary = '',

        [string]$EmotionStyle = 'calm',

        [int]$Success = 1
    )

    try {
        # 1. 插入交互记录
        $insertSql = @"
INSERT INTO interactions (user_message, ai_summary, emotion_style, success)
VALUES (@user, @summary, @emotion, @success);
SELECT last_insert_rowid();
"@

        $command = $Connection.CreateCommand()
        $command.CommandText = $insertSql
        $command.Parameters.AddWithValue('@user', $UserMessage) | Out-Null
        $command.Parameters.AddWithValue('@summary', $AiSummary) | Out-Null
        $command.Parameters.AddWithValue('@emotion', $EmotionStyle) | Out-Null
        $command.Parameters.AddWithValue('@success', $Success) | Out-Null

        $interactionId = [int]$command.ExecuteScalar()
        Write-MemoryLog "Saved interaction ID: $interactionId" -Level Info

        # 2. 生成并存储嵌入向量
        $combinedText = "$UserMessage`n$AiSummary"
        $embedding = Get-OllamaEmbedding -Text $combinedText

        if ($embedding) {
            $blobData = ConvertTo-EmbeddingBlob -Vector $embedding

            $insertVecSql = 'INSERT INTO embeddings (interaction_id, embedding, dimension) VALUES (@id, @vec, @dim)'
            $vecCommand = $Connection.CreateCommand()
            $vecCommand.CommandText = $insertVecSql
            $vecCommand.Parameters.AddWithValue('@id', $interactionId) | Out-Null
            $vecCommand.Parameters.AddWithValue('@vec', $blobData) | Out-Null
            $vecCommand.Parameters.AddWithValue('@dim', $embedding.Count) | Out-Null

            $vecCommand.ExecuteNonQuery() | Out-Null
            Write-MemoryLog "Saved embedding vector ($($embedding.Count) dim)" -Level Debug
        }

        # 3. 更新情感统计
        Update-EmotionStats -Connection $Connection -EmotionStyle $EmotionStyle -Success $Success

        return $interactionId
    }
    catch {
        Write-MemoryLog "Failed to save memory: $_" -Level Error
        throw
    }
}

function Update-EmotionStats {
    <#
    .SYNOPSIS
        Update emotion statistics
        更新情感统计

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$EmotionStyle,

        [int]$Success = 1
    )

    $updateSql = @"
INSERT INTO emotion_stats (emotion_style, count, avg_success_rate, last_used)
VALUES (@emotion, 1, @success, CURRENT_TIMESTAMP)
ON CONFLICT(emotion_style) DO UPDATE SET
    count = count + 1,
    avg_success_rate = (avg_success_rate * count + @success) / (count + 1),
    last_used = CURRENT_TIMESTAMP;
"@

    $command = $Connection.CreateCommand()
    $command.CommandText = $updateSql
    $command.Parameters.AddWithValue('@emotion', $EmotionStyle) | Out-Null
    $command.Parameters.AddWithValue('@success', $Success) | Out-Null

    $command.ExecuteNonQuery() | Out-Null
}

#endregion

#region Semantic Search Functions

function Find-SimilarMemories {
    <#
    .SYNOPSIS
        Find similar past interactions using cosine similarity
        使用余弦相似度查找相似的历史交互

    .DESCRIPTION
        Performs semantic search by comparing embedding vectors
        通过比较嵌入向量执行语义搜索

    .PARAMETER Connection
        SQLite connection object
        SQLite 连接对象

    .PARAMETER QueryText
        Search query text
        搜索查询文本

    .PARAMETER TopK
        Number of results to return
        返回结果数量

    .EXAMPLE
        $similar = Find-SimilarMemories -Connection $conn -QueryText "如何生成文档" -TopK 3
        Find top 3 similar memories
        查找前3个相似记忆

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$QueryText,

        [int]$TopK = 3
    )

    try {
        # 1. 生成查询向量
        $queryEmbedding = Get-OllamaEmbedding -Text $QueryText
        if (-not $queryEmbedding) {
            Write-MemoryLog "Failed to generate query embedding" -Level Warning
            return @()
        }

        # 2. 从数据库获取所有嵌入向量并计算相似度
        $selectSql = @"
SELECT
    i.id,
    i.user_message,
    i.ai_summary,
    i.emotion_style,
    i.timestamp,
    e.embedding
FROM interactions i
JOIN embeddings e ON i.id = e.interaction_id
ORDER BY i.timestamp DESC
LIMIT 100;
"@

        $command = $Connection.CreateCommand()
        $command.CommandText = $selectSql
        $reader = $command.ExecuteReader()

        $results = @()
        while ($reader.Read()) {
            try {
                $embeddingBlob = [byte[]]$reader['embedding']
                if ($null -eq $embeddingBlob -or $embeddingBlob.Length -eq 0) {
                    Write-MemoryLog "Empty embedding blob for interaction $($reader['id'])" -Level Warning
                    continue
                }

                $dbEmbedding = ConvertFrom-EmbeddingBlob -Blob $embeddingBlob
                if ($null -eq $dbEmbedding -or $dbEmbedding.Count -eq 0) {
                    Write-MemoryLog "Failed to convert embedding for interaction $($reader['id'])" -Level Warning
                    continue
                }

                if ($dbEmbedding.Count -ne $queryEmbedding.Count) {
                    Write-MemoryLog "Dimension mismatch: DB=$($dbEmbedding.Count), Query=$($queryEmbedding.Count)" -Level Warning
                    continue
                }

                $similarity = Get-CosineSimilarity -Vector1 $queryEmbedding -Vector2 $dbEmbedding

                $results += [PSCustomObject]@{
                    Id           = $reader['id']
                    UserMessage  = $reader['user_message']
                    AiSummary    = $reader['ai_summary']
                    EmotionStyle = $reader['emotion_style']
                    Timestamp    = $reader['timestamp']
                    Similarity   = $similarity
                }
            }
            catch {
                Write-MemoryLog "Error processing interaction $($reader['id']): $_" -Level Warning
            }
        }
        $reader.Close()

        # 3. 按相似度排序并返回 Top K
        $topResults = $results | Sort-Object -Property Similarity -Descending | Select-Object -First $TopK

        Write-MemoryLog "Found $($topResults.Count) similar memories" -Level Info
        return $topResults
    }
    catch {
        Write-MemoryLog "Failed to search memories: $_" -Level Error
        return @()
    }
}

function Get-CosineSimilarity {
    <#
    .SYNOPSIS
        Calculate cosine similarity between two vectors
        计算两个向量之间的余弦相似度

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [float[]]$Vector1,

        [Parameter(Mandatory = $true)]
        [float[]]$Vector2
    )

    if ($Vector1.Count -ne $Vector2.Count) {
        throw "Vectors must have same dimension"
    }

    $dotProduct = 0.0
    $norm1 = 0.0
    $norm2 = 0.0

    for ($i = 0; $i -lt $Vector1.Count; $i++) {
        $dotProduct += $Vector1[$i] * $Vector2[$i]
        $norm1 += $Vector1[$i] * $Vector1[$i]
        $norm2 += $Vector2[$i] * $Vector2[$i]
    }

    $norm1 = [Math]::Sqrt($norm1)
    $norm2 = [Math]::Sqrt($norm2)

    if ($norm1 -eq 0 -or $norm2 -eq 0) {
        return 0.0
    }

    return $dotProduct / ($norm1 * $norm2)
}

#endregion

#region Adaptive Prompt Generation

function Get-AdaptivePrompt {
    <#
    .SYNOPSIS
        Generate context-enhanced prompt using similar memories
        使用相似记忆生成上下文增强提示词

    .DESCRIPTION
        Retrieves similar past interactions and user preferences
        to create a personalized prompt for AI generation.
        检索相似的历史交互和用户偏好，
        为 AI 生成创建个性化提示词。

    .PARAMETER Connection
        SQLite connection object
        SQLite 连接对象

    .PARAMETER CurrentMessage
        Current user message
        当前用户消息

    .PARAMETER TopK
        Number of similar memories to include
        包含的相似记忆数量

    .EXAMPLE
        $prompt = Get-AdaptivePrompt -Connection $conn -CurrentMessage "创建API文档"
        Generate adaptive prompt
        生成自适应提示词

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$CurrentMessage,

        [int]$TopK = 3
    )

    try {
        # 1. 查找相似历史交互
        $similarMemories = Find-SimilarMemories -Connection $Connection -QueryText $CurrentMessage -TopK $TopK

        # 2. 获取最常用的情感风格
        $emotionSql = 'SELECT emotion_style FROM emotion_stats ORDER BY count DESC LIMIT 1'
        $command = $Connection.CreateCommand()
        $command.CommandText = $emotionSql
        $preferredEmotion = $command.ExecuteScalar()
        if (-not $preferredEmotion) {
            $preferredEmotion = 'calm'
        }

        # 3. 构建上下文示例
        $contextExamples = @()
        foreach ($memory in $similarMemories) {
            if ($memory.Similarity -gt 0.5) {
                $contextExamples += "- 用户: $($memory.UserMessage)`n  回复: $($memory.AiSummary) (相似度: $([math]::Round($memory.Similarity, 2)))"
            }
        }

        # 4. 构建增强提示词
        if ($contextExamples.Count -gt 0) {
            $enhancedPrompt = @"
你是壮爸的个性化AI助手。根据以下历史互动风格生成总结:

【历史相似场景】
$($contextExamples -join "`n")

【用户偏好】
- 最常使用的情感风格: $preferredEmotion

【当前消息】
$CurrentMessage

请生成一个60字以内的语音播报总结，保持个性化风格。
"@
        }
        else {
            $enhancedPrompt = @"
你是壮爸的AI助手。

【当前消息】
$CurrentMessage

请生成一个60字以内的语音播报总结。
"@
        }

        Write-MemoryLog "Generated adaptive prompt with $($contextExamples.Count) examples" -Level Info
        return $enhancedPrompt
    }
    catch {
        Write-MemoryLog "Failed to generate adaptive prompt: $_" -Level Error
        return $CurrentMessage
    }
}

#endregion

#region Statistics and Utilities

function Get-MemoryStatistics {
    <#
    .SYNOPSIS
        Get memory statistics
        获取记忆统计信息

    .PARAMETER Connection
        SQLite connection object
        SQLite 连接对象

    .EXAMPLE
        $stats = Get-MemoryStatistics -Connection $conn
        Get statistics
        获取统计信息

    .NOTES
        Author: 壮爸
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection
    )

    $statsSql = @"
SELECT
    (SELECT COUNT(*) FROM interactions) as total_interactions,
    (SELECT COUNT(*) FROM embeddings) as total_embeddings,
    (SELECT COUNT(*) FROM emotion_stats) as emotion_types,
    (SELECT emotion_style FROM emotion_stats ORDER BY count DESC LIMIT 1) as most_used_emotion,
    (SELECT MAX(timestamp) FROM interactions) as last_interaction
"@

    $command = $Connection.CreateCommand()
    $command.CommandText = $statsSql
    $reader = $command.ExecuteReader()

    $stats = $null
    if ($reader.Read()) {
        $stats = [PSCustomObject]@{
            TotalInteractions = $reader['total_interactions']
            TotalEmbeddings   = $reader['total_embeddings']
            EmotionTypes      = $reader['emotion_types']
            MostUsedEmotion   = $reader['most_used_emotion']
            LastInteraction   = $reader['last_interaction']
        }
    }
    $reader.Close()

    return $stats
}

#endregion

# 导出函数
Export-ModuleMember -Function @(
    'Initialize-VectorMemory',
    'Add-VectorMemory',
    'Find-SimilarMemories',
    'Get-AdaptivePrompt',
    'Get-MemoryStatistics',
    'Get-OllamaEmbedding'
)
