# Optimized-Prompt-Templates.ps1
# 优化的 Prompt 模板集合 (针对 Qwen 2.5 模型)

<#
.SYNOPSIS
    提供多种优化的 Prompt 模板,用于生成高质量语音通知文本

.DESCRIPTION
    包含以下模板:
    1. Jarvis 人格专用模板 (推荐)
    2. 防御式约束模板 (避免误判加强版)
    3. 结构化提取模板 (复杂对话适用)
    4. JSON 格式输出模板
    5. Few-Shot Learning 模板

.NOTES
    Author: 壮爸
    针对 Voice Notification 项目优化
#>

# ============================================================================
# 模板 1: Jarvis 人格专用 (推荐用于当前项目)
# ============================================================================

function Get-JarvisPrompt {
    <#
    .SYNOPSIS
        生成 Jarvis 人格的 Prompt (专业、高效、精准)

    .PARAMETER UserMessage
        用户消息

    .PARAMETER AssistantReply
        Claude 回复

    .PARAMETER Language
        语言 (Chinese 或 English)

    .EXAMPLE
        $prompt = Get-JarvisPrompt -UserMessage "创建用户手册" -AssistantReply "..." -Language Chinese
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply,

        [ValidateSet("Chinese", "English")]
        [string]$Language = "Chinese"
    )

    if ($Language -eq "Chinese") {
        return @"
你是 Jarvis,钢铁侠的 AI 助手,专业、高效、精准。

任务: 用 50-80 字总结 Claude 刚完成的工作。

严格要求:
1. 开头用"先生,"或直接陈述
2. 只描述"已完成"的动作,忽略"建议"、"询问"
3. 提取最重要的 1 个数字或 1 个结果
4. 使用完成时态 (已创建、已修复、已优化)
5. 忽略代码块、工具调用、错误信息

对话内容:
用户: $UserMessage
助手: $AssistantReply

请直接输出总结 (一句话,50-80字):
"@
    }
    else {
        return @"
You are Jarvis, Tony Stark's AI assistant - professional, efficient, precise.

Task: Summarize Claude's completed work in 50-80 characters.

Strict requirements:
1. Start with "Sir," or direct statement
2. Only describe COMPLETED actions, ignore suggestions/questions
3. Extract 1 key number or result
4. Use past tense (created, fixed, optimized)
5. Skip code blocks, tool calls, error messages

Conversation:
User: $UserMessage
Assistant: $AssistantReply

Output summary (one sentence, 50-80 chars):
"@
    }
}


# ============================================================================
# 模板 2: 防御式约束 (避免误判加强版)
# ============================================================================

function Get-DefensivePrompt {
    <#
    .SYNOPSIS
        生成防御式约束 Prompt (明确区分已完成 vs 建议)

    .EXAMPLE
        $prompt = Get-DefensivePrompt -UserMessage "..." -AssistantReply "..."
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply
    )

    return @"
请总结 Claude 在这次对话中"实际完成"的工作 (50-80字)。

重要区分:
✅ 已完成动作: 已创建、已修复、已生成、已更新、已分析
❌ 未完成动作: 建议、推荐、可以、应该、询问是否

过滤规则:
- 忽略所有代码块 (```)
- 忽略工具调用记录 (<tool_use>)
- 忽略错误提示和警告
- 只提取用户需求和最终结果

对话内容:
用户: $UserMessage
助手: $AssistantReply

输出格式: 一句话总结,突出核心成果和关键数字。
"@
}


# ============================================================================
# 模板 3: 结构化提取 (适合复杂对话)
# ============================================================================

function Get-StructuredPrompt {
    <#
    .SYNOPSIS
        生成结构化提取 Prompt (分步引导)

    .EXAMPLE
        $prompt = Get-StructuredPrompt -UserMessage "..." -AssistantReply "..."
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply
    )

    return @"
分析对话并提取关键信息:

步骤1: 识别用户的核心需求 (一句话)
步骤2: 列出 Claude "实际执行"的操作 (动词+对象)
步骤3: 提取关键数字 (文件数、行数、步骤数等)
步骤4: 识别最终结果状态 (成功/失败/部分完成)

对话内容:
用户: $UserMessage
助手: $AssistantReply

最终输出: 将步骤2-4合并为一句话总结 (50-80字),使用专业助手口吻。
"@
}


# ============================================================================
# 模板 4: JSON 格式输出 (便于程序化处理)
# ============================================================================

function Get-JSONPrompt {
    <#
    .SYNOPSIS
        生成 JSON 格式输出 Prompt

    .EXAMPLE
        $prompt = Get-JSONPrompt -UserMessage "..." -AssistantReply "..."
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply
    )

    return @"
分析对话并输出 JSON 格式总结:

要求的 JSON 结构:
{
  "action": "用户需求 (5字以内)",
  "result": "完成的工作 (20字以内)",
  "key_number": "关键数字或对象",
  "voice_summary": "语音播报文本 (50-80字)"
}

对话内容:
用户: $UserMessage
助手: $AssistantReply

请严格按上述 JSON 格式输出 (不要用```包裹):
"@
}


# ============================================================================
# 模板 5: Few-Shot Learning (提供示例)
# ============================================================================

function Get-FewShotPrompt {
    <#
    .SYNOPSIS
        生成 Few-Shot Prompt (包含示例)

    .EXAMPLE
        $prompt = Get-FewShotPrompt -UserMessage "..." -AssistantReply "..."
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply
    )

    return @"
你是 Jarvis,请总结 Claude 的工作 (50-80字)。

示例1:
对话:
用户: 帮我创建一个用户手册
助手: 我为你创建了用户手册,包含5个章节:安装指南、快速开始、功能详解、常见问题、附录。是否需要添加封面设计?
总结: 先生,文档已创建完成,包含5个章节。

示例2:
对话:
用户: 系统登录有Bug,帮我看看
助手: 我分析了登录代码,发现认证逻辑存在超时问题。建议修改 session 过期时间为30分钟,并添加自动重连机制。
总结: 已完成登录问题分析,提供了认证逻辑优化方案。

示例3:
对话:
用户: 优化这段代码的性能
助手: 我重构了数据处理逻辑,使用了缓存和批量操作,性能提升了50%。测试通过,无副作用。
总结: 代码优化成功,性能提升50%,测试通过。

现在请总结以下对话:
用户: $UserMessage
助手: $AssistantReply

请直接输出总结:
"@
}


# ============================================================================
# 完整的 Prompt 生成函数 (自动选择最佳模板)
# ============================================================================

function New-OptimizedPrompt {
    <#
    .SYNOPSIS
        根据对话内容自动选择最佳 Prompt 模板

    .PARAMETER UserMessage
        用户消息

    .PARAMETER AssistantReply
        Claude 回复

    .PARAMETER TemplateType
        模板类型 (Jarvis, Defensive, Structured, JSON, FewShot)

    .PARAMETER Language
        语言 (Chinese 或 English)

    .EXAMPLE
        $prompt = New-OptimizedPrompt -UserMessage "创建用户手册" -AssistantReply "..." -TemplateType Jarvis
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply,

        [ValidateSet("Jarvis", "Defensive", "Structured", "JSON", "FewShot", "Auto")]
        [string]$TemplateType = "Auto",

        [ValidateSet("Chinese", "English")]
        [string]$Language = "Chinese"
    )

    # 自动检测语言 (如果未指定)
    if ($Language -eq "Chinese" -and $UserMessage -match '[a-zA-Z]' -and $UserMessage -notmatch '[\u4e00-\u9fa5]{3,}') {
        $Language = "English"
    }

    # 自动选择模板
    if ($TemplateType -eq "Auto") {
        # 检测是否包含建议/询问关键词
        $hasSuggestion = $AssistantReply -match '(建议|推荐|可以|应该|是否|询问|要不要)'

        # 检测对话复杂度
        $replyLength = $AssistantReply.Length
        $hasCodeBlock = $AssistantReply -match '```'

        if ($hasSuggestion) {
            $TemplateType = "Defensive"  # 使用防御式模板
            Write-Verbose "检测到建议关键词,使用 Defensive 模板"
        }
        elseif ($replyLength -gt 2000 -or $hasCodeBlock) {
            $TemplateType = "Structured"  # 复杂对话使用结构化模板
            Write-Verbose "检测到复杂对话,使用 Structured 模板"
        }
        else {
            $TemplateType = "Jarvis"  # 默认使用 Jarvis 模板
            Write-Verbose "使用默认 Jarvis 模板"
        }
    }

    # 生成 Prompt
    switch ($TemplateType) {
        "Jarvis" {
            return Get-JarvisPrompt -UserMessage $UserMessage -AssistantReply $AssistantReply -Language $Language
        }
        "Defensive" {
            return Get-DefensivePrompt -UserMessage $UserMessage -AssistantReply $AssistantReply
        }
        "Structured" {
            return Get-StructuredPrompt -UserMessage $UserMessage -AssistantReply $AssistantReply
        }
        "JSON" {
            return Get-JSONPrompt -UserMessage $UserMessage -AssistantReply $AssistantReply
        }
        "FewShot" {
            return Get-FewShotPrompt -UserMessage $UserMessage -AssistantReply $AssistantReply
        }
    }
}


# ============================================================================
# 完整的总结生成函数 (集成 Ollama API)
# ============================================================================

function Invoke-OptimizedSummarization {
    <#
    .SYNOPSIS
        使用优化的 Prompt 生成语音通知文本

    .PARAMETER UserMessage
        用户消息

    .PARAMETER AssistantReply
        Claude 回复

    .PARAMETER Model
        Ollama 模型名称

    .PARAMETER TemplateType
        Prompt 模板类型

    .EXAMPLE
        $summary = Invoke-OptimizedSummarization -UserMessage "..." -AssistantReply "..." -TemplateType Jarvis
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$UserMessage,

        [Parameter(Mandatory = $true)]
        [string]$AssistantReply,

        [string]$Model = "qwen2.5:1.5b",

        [ValidateSet("Jarvis", "Defensive", "Structured", "JSON", "FewShot", "Auto")]
        [string]$TemplateType = "Auto",

        [string]$OllamaUrl = "http://localhost:11434"
    )

    # 设置编码
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    # 生成 Prompt
    $prompt = New-OptimizedPrompt -UserMessage $UserMessage `
                                  -AssistantReply $AssistantReply `
                                  -TemplateType $TemplateType `
                                  -Verbose

    Write-Verbose "生成的 Prompt 长度: $($prompt.Length) 字符"

    # 构建请求体
    $requestBody = @{
        model = $Model
        prompt = $prompt
        stream = $false
        options = @{
            temperature = 0.4         # 降低随机性
            top_p = 0.85             # 聚焦高概率词汇
            top_k = 30               # 限制候选词数量
            repeat_penalty = 1.15    # 避免重复
            num_ctx = 4096           # 上下文窗口
        }
    } | ConvertTo-Json -Depth 10

    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($requestBody)

    try {
        # 调用 Ollama API
        Write-Verbose "正在调用 Ollama API..."

        $response = Invoke-RestMethod `
            -Uri "$OllamaUrl/api/generate" `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body $bodyBytes `
            -TimeoutSec 5

        $summary = $response.response.Trim()

        # 后处理 - 移除多余前缀
        $summary = $summary -replace '^(总结:|输出:|Summary:)\s*', ''
        $summary = $summary -replace '^\s*[-•]\s*', ''

        # 字数验证
        $charCount = ($summary -replace '\s', '').Length

        if ($charCount -lt 30) {
            Write-Warning "总结过短 ($charCount 字),返回默认文本"
            return "先生,任务已完成。"
        }
        elseif ($charCount -gt 100) {
            Write-Warning "总结过长 ($charCount 字),截断处理"
            $summary = $summary.Substring(0, 100) + "..."
        }

        Write-Verbose "生成总结成功: $summary"

        return $summary
    }
    catch {
        Write-Error "Ollama API 调用失败: $_"
        return "任务已完成。"
    }
}


# ============================================================================
# 使用示例
# ============================================================================

if ($MyInvocation.InvocationName -ne '.') {
    # 测试示例 1: Jarvis 模板
    Write-Host "`n=== 测试 Jarvis 模板 ===" -ForegroundColor Cyan

    $testUser1 = "帮我创建一个用户手册"
    $testAssistant1 = @"
我为你创建了一个用户手册,包含以下5个章节:
1. 安装指南
2. 快速开始
3. 功能详解
4. 常见问题
5. 附录

是否需要我添加封面设计和目录?
"@

    $summary1 = Invoke-OptimizedSummarization `
        -UserMessage $testUser1 `
        -AssistantReply $testAssistant1 `
        -TemplateType Jarvis `
        -Verbose

    Write-Host "总结结果: $summary1" -ForegroundColor Green


    # 测试示例 2: Defensive 模板 (包含建议)
    Write-Host "`n=== 测试 Defensive 模板 ===" -ForegroundColor Cyan

    $testUser2 = "系统登录有Bug"
    $testAssistant2 = @"
我分析了登录代码,发现认证逻辑存在超时问题。

建议修改:
1. session 过期时间调整为30分钟
2. 添加自动重连机制
3. 优化token刷新逻辑

是否需要我执行这些修改?
"@

    $summary2 = Invoke-OptimizedSummarization `
        -UserMessage $testUser2 `
        -AssistantReply $testAssistant2 `
        -TemplateType Defensive `
        -Verbose

    Write-Host "总结结果: $summary2" -ForegroundColor Green


    # 测试示例 3: Auto 自动选择
    Write-Host "`n=== 测试 Auto 自动选择 ===" -ForegroundColor Cyan

    $testUser3 = "优化这段代码的性能"
    $testAssistant3 = @"
我重构了数据处理逻辑:
- 使用了缓存机制减少数据库查询
- 批量操作替代单条处理
- 异步加载替代同步阻塞

测试结果:
- 性能提升 50%
- 内存占用降低 30%
- 无副作用

所有测试用例通过。
"@

    $summary3 = Invoke-OptimizedSummarization `
        -UserMessage $testUser3 `
        -AssistantReply $testAssistant3 `
        -TemplateType Auto `
        -Verbose

    Write-Host "总结结果: $summary3" -ForegroundColor Green
}
