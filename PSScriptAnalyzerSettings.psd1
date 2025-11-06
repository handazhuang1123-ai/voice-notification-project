@{
    # PSScriptAnalyzer Configuration - Automated Checks Only
    # PSScriptAnalyzer 閰嶇疆 - 浠呰嚜鍔ㄦ鏌ラ」

    # Include only rules that can be automatically detected
    # 鍙寘鍚兘琚嚜鍔ㄦ娴嬬殑瑙勫垯
    IncludeRules = @(
        # Avoid using aliases - use full cmdlet names
        # 閬垮厤浣跨敤鍒悕 - 浣跨敤瀹屾暣鐨?Cmdlet 鍚嶇О
        'PSAvoidUsingCmdletAliases',

        # Avoid using Write-Host
        # 閬垮厤浣跨敤 Write-Host
        'PSAvoidUsingWriteHost',

        # Use approved PowerShell verbs
        # 浣跨敤鎵瑰噯鐨?PowerShell 鍔ㄨ瘝
        'PSUseApprovedVerbs',

        # Use singular nouns for cmdlet names
        # Cmdlet 鍚嶇О浣跨敤鍗曟暟鍚嶈瘝
        'PSUseSingularNouns',

        # Provide comment-based help
        # 鎻愪緵鍩轰簬娉ㄩ噴鐨勫府鍔╂枃妗?
        'PSProvideCommentHelp',

        # Use UTF-8 encoding with BOM for PowerShell files
        # PowerShell 鏂囦欢浣跨敤 UTF-8 BOM 缂栫爜
        'PSUseBOMForUnicodeEncodedFile',

        # Use correct casing for cmdlets and parameters
        # 浣跨敤姝ｇ‘鐨?Cmdlet 鍜屽弬鏁板ぇ灏忓啓
        'PSUseCorrectCasing',

        # Code formatting rules
        # 浠ｇ爜鏍煎紡鍖栬鍒?
        'PSPlaceOpenBrace',
        'PSPlaceCloseBrace',
        'PSUseConsistentIndentation',
        'PSUseConsistentWhitespace'
    )

    # Exclude rules that require manual verification
    # 鎺掗櫎闇€瑕佹墜鍔ㄩ獙璇佺殑瑙勫垯
    ExcludeRules = @()

    # Rule configurations
    # 瑙勫垯閰嶇疆
    Rules = @{
        # Open brace placement - OTBS style (same line)
        # 寮€鎷彿浣嶇疆 - OTBS 椋庢牸锛堝悓琛岋級
        PSPlaceOpenBrace = @{
            Enable = $true
            OnSameLine = $true
            NewLineAfter = $true
            IgnoreOneLineBlock = $true
        }

        # Close brace placement
        # 闂嫭鍙蜂綅缃?
        PSPlaceCloseBrace = @{
            Enable = $true
            NewLineAfter = $true
            IgnoreOneLineBlock = $true
            NoEmptyLineBefore = $false
        }

        # Indentation - 4 spaces
        # 缂╄繘 - 4涓┖鏍?
        PSUseConsistentIndentation = @{
            Enable = $true
            IndentationSize = 4
            PipelineIndentation = 'IncreaseIndentationForFirstPipeline'
            Kind = 'space'
        }

        # Whitespace consistency
        # 绌烘牸涓€鑷存€?
        PSUseConsistentWhitespace = @{
            Enable = $true
            CheckInnerBrace = $true
            CheckOpenBrace = $true
            CheckOpenParen = $true
            CheckOperator = $true
            CheckPipe = $true
            CheckSeparator = $true
            CheckParameter = $false
        }

        # Correct casing for cmdlets
        # Cmdlet 姝ｇ‘澶у皬鍐?
        PSUseCorrectCasing = @{
            Enable = $true
        }

        # Avoid using aliases
        # 閬垮厤浣跨敤鍒悕
        PSAvoidUsingCmdletAliases = @{
            Enable = $true
            Whitelist = @()  # No exceptions | 鏃犱緥澶?
        }

        # Comment-based help
        # 鍩轰簬娉ㄩ噴鐨勫府鍔?
        PSProvideCommentHelp = @{
            Enable = $true
            ExportedOnly = $true
            BlockComment = $true
            VSCodeSnippetCorrection = $false
            Placement = 'before'
        }

        # Approved verbs
        # 鎵瑰噯鐨勫姩璇?
        PSUseApprovedVerbs = @{
            Enable = $true
        }

        # Singular nouns
        # 鍗曟暟鍚嶈瘝
        PSUseSingularNouns = @{
            Enable = $true
        }
    }

    # Severity levels to report (Error, Warning, Information)
    # 瑕佹姤鍛婄殑涓ラ噸鎬х骇鍒紙閿欒銆佽鍛娿€佷俊鎭級
    Severity = @('Error', 'Warning')

    # Include default rules
    # 鍖呭惈榛樿瑙勫垯
    IncludeDefaultRules = $true

    # Custom rule paths (if any)
    # 鑷畾涔夎鍒欒矾寰勶紙濡傛灉鏈夛級
    CustomRulePath = @()
}
