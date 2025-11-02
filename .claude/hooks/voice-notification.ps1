# Voice Notification Hook - No Chinese in Code
# All Chinese text loaded from JSON

param()

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

function Write-DebugLog {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $debugLog = Join-Path $PSScriptRoot "voice-debug.log"
    $logEntry = "$timestamp | $message`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($debugLog, $logEntry, $utf8NoBom)
}

function Generate-Summary {
    param($UserMessage, $ClaudeReply, $Templates, $Keywords)

    $user = if ($UserMessage.Length -gt 200) { $UserMessage.Substring(0, 200) } else { $UserMessage }

    Write-DebugLog "User msg length: $($user.Length)"

    # Check each category
    foreach ($category in $Keywords.PSObject.Properties) {
        $catName = $category.Name
        $keywordList = $category.Value

        $matched = $false
        foreach ($kw in $keywordList) {
            if ($user.IndexOf($kw) -ge 0) {
                $matched = $true
                Write-DebugLog "Matched: $catName with keyword: $kw"
                break
            }
        }

        if ($matched) {
            # Special handling for document creation with filename
            if ($catName -eq "document_creation") {
                $searchStr = [char]0x540D + [char]0x4E3A  # Unicode for "名为"
                $nameIdx = $user.IndexOf($searchStr)
                if ($nameIdx -ge 0) {
                    $afterName = $user.Substring($nameIdx + 2).Trim()
                    # Find first space or punctuation
                    $endIdx = -1
                    for ($i = 0; $i -lt $afterName.Length; $i++) {
                        $c = $afterName[$i]
                        if ($c -eq ' ' -or $c -eq ',' -or $c -eq "`n" -or [int]$c -eq 0x3002 -or [int]$c -eq 0xFF0C) {
                            $endIdx = $i
                            break
                        }
                    }
                    if ($endIdx -gt 0) {
                        $fileName = $afterName.Substring(0, $endIdx)
                    } else {
                        $fileName = $afterName.Substring(0, [Math]::Min(20, $afterName.Length))
                    }
                    $template = $Templates.document_creation_with_name
                    return $template -replace '\{name\}', $fileName
                }
            }

            # Return category template
            return $Templates.$catName
        }
    }

    # General case - extract first sentence
    $endIdx = -1
    for ($i = 0; $i -lt $user.Length; $i++) {
        $c = [int]$user[$i]
        # Check for newline, Chinese comma (0xFF0C), Chinese period (0x3002)
        if ($user[$i] -eq "`n" -or $c -eq 0xFF0C -or $c -eq 0x3002) {
            $endIdx = $i
            break
        }
    }

    if ($endIdx -gt 5 -and $endIdx -le 50) {
        $firstSentence = $user.Substring(0, $endIdx).Trim()
        $template = $Templates.general_with_task
        return $template -replace '\{task\}', $firstSentence
    }

    return $Templates.general_default
}

try {
    Write-DebugLog "=== Voice Notification Started ==="

    # Load templates
    $templatesPath = Join-Path $PSScriptRoot "voice-templates.json"
    if (!(Test-Path $templatesPath)) {
        Write-DebugLog "ERROR: Templates file not found"
        exit 0
    }

    $config = Get-Content $templatesPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $templates = $config.templates
    $keywords = $config.keywords

    Write-DebugLog "Templates loaded successfully"

    # Read stdin
    $inputLines = @()
    while ($null -ne ($line = [Console]::ReadLine())) {
        $inputLines += $line
    }
    $inputData = $inputLines -join "`n"

    if ([string]::IsNullOrWhiteSpace($inputData)) {
        Write-DebugLog "Empty input"
        exit 0
    }

    $hookInput = $inputData | ConvertFrom-Json
    $transcriptPath = $hookInput.transcript_path

    Write-DebugLog "Transcript path: $transcriptPath"

    $summary = $templates.general_default

    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        Write-DebugLog "Transcript file exists"

        $lines = Get-Content $transcriptPath -Encoding UTF8 -ErrorAction SilentlyContinue
        Write-DebugLog "Total lines in transcript: $($lines.Count)"

        $lastUser = ""
        $lastClaude = ""
        $userIdx = -1

        # Find last user message and Claude response
        for ($i = $lines.Count - 1; $i -ge 0; $i--) {
            if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }

            try {
                $entry = $lines[$i] | ConvertFrom-Json

                # Find user message - handle both old and new transcript formats
                if ([string]::IsNullOrEmpty($lastUser)) {
                    $isUserMessage = $false
                    $content = $null

                    # New format: type="user", message.role="user", message.content
                    if ($entry.type -eq "user" -and $entry.message -and $entry.message.role -eq "user") {
                        $isUserMessage = $true
                        $content = $entry.message.content
                    }
                    # Old format: type="input"/"message", role="user", content
                    elseif (($entry.type -eq "input" -or $entry.type -eq "message") -and $entry.role -eq "user") {
                        $isUserMessage = $true
                        $content = $entry.content
                    }

                    if ($isUserMessage -and $content) {
                        # Handle array content
                        if ($content -is [Array]) {
                            foreach ($item in $content) {
                                if ($item.type -eq "text" -and $item.text) {
                                    $lastUser = $item.text
                                    $userIdx = $i
                                    Write-DebugLog "Found user message at line: $i"
                                    Write-DebugLog "User message preview: $($lastUser.Substring(0, [Math]::Min(50, $lastUser.Length)))"
                                    break
                                }
                            }
                        }
                        # Handle string content directly
                        elseif ($content -is [String]) {
                            $lastUser = $content
                            $userIdx = $i
                            Write-DebugLog "Found user message at line: $i (string)"
                            Write-DebugLog "User message preview: $($lastUser.Substring(0, [Math]::Min(50, $lastUser.Length)))"
                        }
                    }
                }

                # Find Claude response - handle both old and new transcript formats
                if ($userIdx -ge 0 -and $i -gt $userIdx -and [string]::IsNullOrEmpty($lastClaude)) {
                    $isAssistantMessage = $false
                    $content = $null

                    # New format: type="assistant", message.role="assistant", message.content
                    if ($entry.type -eq "assistant" -and $entry.message -and $entry.message.role -eq "assistant") {
                        $isAssistantMessage = $true
                        $content = $entry.message.content
                    }
                    # Old format: type="output"/"message", role="assistant", content
                    elseif (($entry.type -eq "output" -or $entry.type -eq "message") -and $entry.role -eq "assistant") {
                        $isAssistantMessage = $true
                        $content = $entry.content
                    }

                    if ($isAssistantMessage -and $content) {
                        # Handle array content
                        if ($content -is [Array]) {
                            foreach ($item in $content) {
                                if ($item.type -eq "text" -and $item.text) {
                                    $lastClaude = $item.text
                                    Write-DebugLog "Found Claude reply at line: $i"
                                    Write-DebugLog "Claude reply preview: $($lastClaude.Substring(0, [Math]::Min(50, $lastClaude.Length)))"
                                    break
                                }
                            }
                        }
                        # Handle string content directly
                        elseif ($content -is [String]) {
                            $lastClaude = $content
                            Write-DebugLog "Found Claude reply at line: $i (string)"
                            Write-DebugLog "Claude reply preview: $($lastClaude.Substring(0, [Math]::Min(50, $lastClaude.Length)))"
                        }
                    }
                }

                if (![string]::IsNullOrEmpty($lastUser) -and ![string]::IsNullOrEmpty($lastClaude)) {
                    Write-DebugLog "Both user and Claude messages found, stopping search"
                    break
                }
            } catch {
                Write-DebugLog "Error parsing line ${i}: $($_.Exception.Message)"
                continue
            }
        }

        Write-DebugLog "Final - User message length: $($lastUser.Length)"
        Write-DebugLog "Final - Claude reply length: $($lastClaude.Length)"

        if (![string]::IsNullOrEmpty($lastUser)) {
            Write-DebugLog "Generating summary from user message"
            $summary = Generate-Summary -UserMessage $lastUser -ClaudeReply $lastClaude -Templates $templates -Keywords $keywords
            Write-DebugLog "Generated summary: $summary"
        } else {
            Write-DebugLog "No user message found, using default"
        }
    } else {
        Write-DebugLog "Transcript file does not exist or path is empty"
    }

    # Ensure summary is not too long
    if ($summary.Length -gt 100) {
        $summary = $summary.Substring(0, 97) + "..."
        Write-DebugLog "Summary truncated to 100 chars"
    }

    Write-DebugLog "FINAL SUMMARY: $summary"

    # Voice playback
    $jobScript = {
        param($text)
        try {
            $voice = New-Object -ComObject SAPI.SpVoice
            $voice.Volume = 100
            $voice.Rate = -1
            $voice.Speak($text, 0)
            return "SUCCESS"
        } catch {
            return "ERROR: $($_.Exception.Message)"
        }
    }

    Write-DebugLog "Starting voice playback job"
    $job = Start-Job -ScriptBlock $jobScript -ArgumentList $summary
    Wait-Job -Job $job -Timeout 5 | Out-Null
    $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Write-DebugLog "Voice playback result: $result"

    # Log to voice notifications file
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $PSScriptRoot "voice-notifications.log"
    $logEntry = "$timestamp | $summary`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($logPath, $logEntry, $utf8NoBom)

    Write-DebugLog "=== Voice Notification Completed ==="
    exit 0

} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $errorLog = Join-Path $PSScriptRoot "voice-notification-errors.log"
    $errorMsg = "$timestamp | ERROR | $($_.Exception.Message) | $($_.ScriptStackTrace)`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($errorLog, $errorMsg, $utf8NoBom)
    Write-DebugLog "FATAL ERROR: $($_.Exception.Message)"
    exit 0
}
