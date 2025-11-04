# Message Extraction Module
# Extracts last user message and Claude's reply from transcript

param(
    [Parameter(Mandatory=$true)]
    [string]$TranscriptPath
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-ModuleLog {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path (Split-Path $PSScriptRoot) "hooks\extract-messages.log"
    $logEntry = "$timestamp | $message`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($logPath, $logEntry, $utf8NoBom)
}

try {
    Write-ModuleLog "=== Extract Messages Started ==="
    Write-ModuleLog "Transcript path: $TranscriptPath"

    if (!(Test-Path $TranscriptPath)) {
        Write-ModuleLog "ERROR: Transcript file not found"
        return @{ UserMessage = ""; ClaudeReply = ""; Success = $false }
    }

    # Wait for transcript to be fully written with retry logic
    $maxRetries = 3
    $lastLineCount = 0

    for ($i = 0; $i -lt $maxRetries; $i++) {
        Start-Sleep -Milliseconds 800
        $lines = Get-Content $TranscriptPath -Encoding UTF8 -ErrorAction SilentlyContinue
        $currentLineCount = $lines.Count

        Write-ModuleLog "Retry $($i + 1): Line count = $currentLineCount"

        # If line count hasn't changed, transcript is stable
        if ($currentLineCount -eq $lastLineCount -and $i -gt 0) {
            Write-ModuleLog "Transcript stable, proceeding"
            break
        }

        $lastLineCount = $currentLineCount
    }

    Write-ModuleLog "Total lines: $($lines.Count)"

    $lastUser = ""
    $lastClaude = ""
    $claudeIdx = -1

    # Strategy: First find the last assistant message (Claude's reply)
    # Then find the last user message before it
    # This works better when scanning from bottom to top

    # Parse transcript from bottom to top
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }

        try {
            $entry = $lines[$i] | ConvertFrom-Json

            # First priority: Find Claude's last text response (not tool_use)
            if ([string]::IsNullOrEmpty($lastClaude)) {
                $isAssistantMessage = $false
                $content = $null

                # New format: type="assistant"
                if ($entry.type -eq "assistant" -and $entry.message -and $entry.message.role -eq "assistant") {
                    $isAssistantMessage = $true
                    $content = $entry.message.content
                }
                # Old format: type="output"/"message", role="assistant"
                elseif (($entry.type -eq "output" -or $entry.type -eq "message") -and $entry.role -eq "assistant") {
                    $isAssistantMessage = $true
                    $content = $entry.content
                }

                if ($isAssistantMessage -and $content) {
                    # Handle array content - look for text type, skip tool_use
                    if ($content -is [Array]) {
                        foreach ($item in $content) {
                            if ($item.type -eq "text" -and $item.text) {
                                $lastClaude = $item.text
                                $claudeIdx = $i
                                Write-ModuleLog "Found Claude reply at line $i"
                                break
                            }
                        }
                    }
                    # Handle string content
                    elseif ($content -is [String]) {
                        $lastClaude = $content
                        $claudeIdx = $i
                        Write-ModuleLog "Found Claude reply at line $i (string)"
                    }
                }
            }

            # Second priority: Find user message BEFORE Claude's reply
            if (($claudeIdx -ge 0) -and ($i -lt $claudeIdx) -and [string]::IsNullOrEmpty($lastUser)) {
                $isUserMessage = $false
                $content = $null

                # New format: type="user", message.role="user"
                if ($entry.type -eq "user" -and $entry.message -and $entry.message.role -eq "user") {
                    $isUserMessage = $true
                    $content = $entry.message.content
                }
                # Old format: type="input"/"message", role="user"
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
                                Write-ModuleLog "Found user message at line $i"
                                break
                            }
                        }
                    }
                    # Handle string content
                    elseif ($content -is [String]) {
                        $lastUser = $content
                        Write-ModuleLog "Found user message at line $i (string)"
                    }
                }
            }

            # Stop when both found
            if (![string]::IsNullOrEmpty($lastUser) -and ![string]::IsNullOrEmpty($lastClaude)) {
                Write-ModuleLog "Both messages found, stopping search"
                break
            }
        } catch {
            Write-ModuleLog "Error parsing line ${i}: $($_.Exception.Message)"
            continue
        }
    }

    Write-ModuleLog "User message length: $($lastUser.Length)"
    Write-ModuleLog "Claude reply length: $($lastClaude.Length)"

    $result = @{
        UserMessage = $lastUser
        ClaudeReply = $lastClaude
        Success = (![string]::IsNullOrEmpty($lastUser))
    }

    Write-ModuleLog "=== Extract Messages Completed ==="
    return $result

} catch {
    Write-ModuleLog "FATAL ERROR: $($_.Exception.Message)"
    return @{ UserMessage = ""; ClaudeReply = ""; Success = $false }
}
