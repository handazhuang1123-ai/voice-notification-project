# VectorMemory 扩展方案 - 个人知识库

## 🎯 目标
将现有的向量记忆系统扩展为通用的个人知识库，支持存储和检索各种类型的文本内容。

## 📊 扩展数据库结构

### 1. 新增 knowledge 表（知识条目）

```sql
CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,                    -- 标题
    content TEXT NOT NULL,          -- 内容（可以很长）
    category TEXT,                  -- 分类：document/code/web/note/chat
    source TEXT,                    -- 来源：文件路径或URL
    tags TEXT,                      -- 标签（逗号分隔）
    metadata TEXT,                  -- JSON格式的元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 对应的向量表
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    knowledge_id INTEGER PRIMARY KEY,
    embedding BLOB NOT NULL,
    chunk_index INTEGER DEFAULT 0,  -- 如果内容太长，分块存储
    FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
);
```

## 🛠️ 新增功能函数

### 1. 添加知识条目

```powershell
function Add-KnowledgeEntry {
    <#
    .SYNOPSIS
        Add any text content to knowledge base
        添加任意文本内容到知识库

    .EXAMPLE
        # 添加文档
        Add-KnowledgeEntry -Title "PowerShell教程" -Content $docContent -Category "document"

        # 添加网页
        Add-KnowledgeEntry -Title "有趣的文章" -Content $webContent -Category "web" -Source $url

        # 添加代码
        Add-KnowledgeEntry -Title "数据处理函数" -Content $codeSnippet -Category "code" -Tags "powershell,data"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [string]$Title = "",

        [Parameter(Mandatory = $true)]
        [string]$Content,

        [ValidateSet('document', 'code', 'web', 'note', 'chat', 'other')]
        [string]$Category = 'other',

        [string]$Source = "",

        [string]$Tags = "",

        [hashtable]$Metadata = @{}
    )

    # 如果内容太长（> 8000字符），需要分块
    $chunks = Split-TextIntoChunks -Text $Content -MaxLength 8000

    # 插入主记录
    $insertSql = @"
INSERT INTO knowledge (title, content, category, source, tags, metadata)
VALUES (@title, @content, @category, @source, @tags, @metadata);
SELECT last_insert_rowid();
"@

    $command = $Connection.CreateCommand()
    $command.CommandText = $insertSql
    $command.Parameters.AddWithValue('@title', $Title)
    $command.Parameters.AddWithValue('@content', $Content)
    $command.Parameters.AddWithValue('@category', $Category)
    $command.Parameters.AddWithValue('@source', $Source)
    $command.Parameters.AddWithValue('@tags', $Tags)
    $command.Parameters.AddWithValue('@metadata', ($Metadata | ConvertTo-Json -Compress))

    $knowledgeId = [int]$command.ExecuteScalar()

    # 为每个分块生成向量
    $chunkIndex = 0
    foreach ($chunk in $chunks) {
        $embedding = Get-OllamaEmbedding -Text $chunk

        if ($embedding) {
            $blobData = ConvertTo-EmbeddingBlob -Vector $embedding

            $insertVecSql = @"
INSERT INTO knowledge_embeddings (knowledge_id, embedding, chunk_index)
VALUES (@id, @vec, @index)
"@

            $vecCommand = $Connection.CreateCommand()
            $vecCommand.CommandText = $insertVecSql
            $vecCommand.Parameters.AddWithValue('@id', $knowledgeId)
            $vecCommand.Parameters.AddWithValue('@vec', $blobData)
            $vecCommand.Parameters.AddWithValue('@index', $chunkIndex)

            $vecCommand.ExecuteNonQuery()
            $chunkIndex++
        }
    }

    Write-Host "✓ Added knowledge entry: $Title (ID: $knowledgeId, Chunks: $chunkIndex)" -ForegroundColor Green
    return $knowledgeId
}
```

### 2. 搜索知识库

```powershell
function Search-Knowledge {
    <#
    .SYNOPSIS
        Search knowledge base using semantic similarity
        使用语义相似度搜索知识库

    .EXAMPLE
        # 搜索所有内容
        Search-Knowledge -Query "如何处理错误" -TopK 5

        # 只搜索特定类别
        Search-Knowledge -Query "数组操作" -Category "code" -TopK 3

        # 搜索特定标签
        Search-Knowledge -Query "性能优化" -Tags "powershell"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$Query,

        [string]$Category = "",

        [string]$Tags = "",

        [int]$TopK = 5
    )

    # 生成查询向量
    $queryEmbedding = Get-OllamaEmbedding -Text $Query
    if (-not $queryEmbedding) { return @() }

    # 构建SQL查询
    $whereClause = "WHERE 1=1"
    if ($Category) {
        $whereClause += " AND k.category = '$Category'"
    }
    if ($Tags) {
        $whereClause += " AND k.tags LIKE '%$Tags%'"
    }

    $selectSql = @"
SELECT DISTINCT
    k.id,
    k.title,
    k.content,
    k.category,
    k.source,
    k.tags,
    k.created_at,
    ke.embedding,
    ke.chunk_index
FROM knowledge k
JOIN knowledge_embeddings ke ON k.id = ke.knowledge_id
$whereClause
"@

    $command = $Connection.CreateCommand()
    $command.CommandText = $selectSql
    $reader = $command.ExecuteReader()

    $results = @()
    while ($reader.Read()) {
        $dbEmbedding = ConvertFrom-EmbeddingBlob -Blob ([byte[]]$reader['embedding'])
        $similarity = Get-CosineSimilarity -Vector1 $queryEmbedding -Vector2 $dbEmbedding

        $results += [PSCustomObject]@{
            Id = $reader['id']
            Title = $reader['title']
            Content = $reader['content'].Substring(0, [Math]::Min(200, $reader['content'].Length))
            Category = $reader['category']
            Source = $reader['source']
            Tags = $reader['tags']
            Similarity = $similarity
        }
    }
    $reader.Close()

    # 按相似度排序
    return $results | Sort-Object -Property Similarity -Descending | Select-Object -First $TopK
}
```

### 3. 批量导入功能

```powershell
function Import-DocumentsToKnowledge {
    <#
    .SYNOPSIS
        Batch import documents to knowledge base
        批量导入文档到知识库

    .EXAMPLE
        # 导入所有 Markdown 文件
        Import-DocumentsToKnowledge -Path ".\docs" -Pattern "*.md" -Category "document"

        # 导入所有 PowerShell 脚本
        Import-DocumentsToKnowledge -Path ".\scripts" -Pattern "*.ps1" -Category "code"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Data.SQLite.SQLiteConnection]$Connection,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Pattern = "*.*",

        [string]$Category = "document"
    )

    $files = Get-ChildItem -Path $Path -Filter $Pattern -Recurse
    $successCount = 0

    foreach ($file in $files) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

            $id = Add-KnowledgeEntry `
                -Connection $Connection `
                -Title $file.Name `
                -Content $content `
                -Category $Category `
                -Source $file.FullName `
                -Tags $file.Extension.TrimStart('.')

            $successCount++
            Write-Host "  ✓ Imported: $($file.Name)" -ForegroundColor Green
        }
        catch {
            Write-Warning "Failed to import $($file.Name): $_"
        }
    }

    Write-Host "`n✓ Imported $successCount/$($files.Count) files" -ForegroundColor Cyan
}
```

## 📋 使用场景示例

### 场景1：构建个人技术文档库

```powershell
# 导入所有技术文档
Import-DocumentsToKnowledge -Path "H:\我的文档" -Pattern "*.md" -Category "document"

# 搜索相关内容
$results = Search-Knowledge -Query "如何配置Git" -Category "document"
```

### 场景2：代码片段管理

```powershell
# 保存有用的代码片段
$codeSnippet = @'
function Get-ProcessMemory {
    param([string]$ProcessName)
    Get-Process $ProcessName | Select-Object Name, @{
        Name='MemoryMB'
        Expression={[Math]::Round($_.WS / 1MB, 2)}
    }
}
'@

Add-KnowledgeEntry -Title "获取进程内存" -Content $codeSnippet -Category "code" -Tags "process,memory"

# 搜索代码
$results = Search-Knowledge -Query "内存使用" -Category "code"
```

### 场景3：网页内容收藏

```powershell
# 保存网页内容
$article = Invoke-WebRequest "https://example.com/article"
Add-KnowledgeEntry `
    -Title "有趣的技术文章" `
    -Content $article.Content `
    -Category "web" `
    -Source "https://example.com/article" `
    -Tags "技术,学习"

# 搜索收藏
$results = Search-Knowledge -Query "相关技术点" -Category "web"
```

### 场景4：与语音通知集成

```powershell
# 在生成语音通知时，不仅搜索历史交互，还搜索知识库
function Get-EnhancedContext {
    param(
        [string]$Query
    )

    # 搜索历史交互
    $interactions = Find-SimilarMemories -QueryText $Query -TopK 3

    # 搜索知识库
    $knowledge = Search-Knowledge -Query $Query -TopK 2

    # 组合上下文
    $context = @"
【相关历史】
$($interactions | ForEach-Object { "- $($_.UserMessage)" })

【知识库参考】
$($knowledge | ForEach-Object { "- [$($_.Category)] $($_.Title): $($_.Content.Substring(0, 100))..." })
"@

    return $context
}
```

## 🎯 优势

1. **统一的语义搜索** - 所有内容都可以通过自然语言搜索
2. **跨类型关联** - 可以找到代码、文档、笔记之间的关联
3. **持续学习** - 随着内容增加，搜索越来越精准
4. **本地化** - 所有数据都在本地，隐私安全

## 🚀 快速开始

```powershell
# 1. 更新数据库结构
$updateSql = @"
CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT NOT NULL,
    category TEXT,
    source TEXT,
    tags TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    knowledge_id INTEGER PRIMARY KEY,
    embedding BLOB NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
);
"@

$connection = Initialize-VectorMemory
$command = $connection.CreateCommand()
$command.CommandText = $updateSql
$command.ExecuteNonQuery()

# 2. 导入一些内容测试
Add-KnowledgeEntry -Connection $connection -Title "测试文档" -Content "这是测试内容..." -Category "document"

# 3. 搜索测试
$results = Search-Knowledge -Connection $connection -Query "测试"
```

## 📈 长期价值

随着时间推移，你的知识库会成为：
- **个人的 Google** - 搜索自己的所有内容
- **智能助手的大脑** - AI可以引用你的知识回答问题
- **知识管理系统** - 自动整理和关联信息

---

**作者**：壮爸
**版本**：1.0
**日期**：2025-01-13