<#
.SYNOPSIS
    调用 Stable Diffusion WebUI API 执行 Inpainting 任务

.DESCRIPTION
    通过 SD WebUI 的 API 接口，在指定 mask 区域内生成新内容，保留 mask 外区域不变。
    适用于在现有图片上添加元素（如添加右手）而不影响其他部分。

.PARAMETER ImagePath
    原始图片路径

.PARAMETER MaskPath
    Mask 图片路径（白色=修改区域，黑色=保留区域）

.PARAMETER Prompt
    生成内容的提示词

.PARAMETER NegativePrompt
    负面提示词（避免生成的内容）

.PARAMETER OutputDir
    输出目录，默认为脚本所在目录的 output 子目录

.PARAMETER BatchCount
    生成图片数量，默认 4 张

.PARAMETER DenoisingStrength
    去噪强度 0-1，越低保留原图越多，默认 0.75

.PARAMETER Steps
    采样步数，默认 30

.PARAMETER SDUrl
    SD WebUI 地址，默认 http://127.0.0.1:7860

.EXAMPLE
    .\Invoke-SDInpaint.ps1 -ImagePath ".\pipboy.png" -MaskPath ".\mask.png" -Prompt "a right hand with leather glove"

.EXAMPLE
    .\Invoke-SDInpaint.ps1 -ImagePath ".\pipboy.png" -MaskPath ".\mask.png" -Prompt "right hand" -DenoisingStrength 0.5 -BatchCount 8
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath,

    [Parameter(Mandatory = $true)]
    [string]$MaskPath,

    [Parameter(Mandatory = $true)]
    [string]$Prompt,

    [string]$NegativePrompt = "bad anatomy, bad hands, missing fingers, extra fingers, deformed, blurry, low quality",

    [string]$OutputDir,

    [int]$BatchCount = 4,

    [ValidateRange(0.1, 1.0)]
    [double]$DenoisingStrength = 0.75,

    [int]$Steps = 30,

    [string]$SDUrl = "http://127.0.0.1:7860"
)

$ErrorActionPreference = "Stop"

# 设置输出目录
if (-not $OutputDir) {
    $OutputDir = Join-Path $PSScriptRoot "output"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 验证文件存在
if (-not (Test-Path $ImagePath)) {
    throw "图片文件不存在: $ImagePath"
}
if (-not (Test-Path $MaskPath)) {
    throw "Mask 文件不存在: $MaskPath"
}

# 转换图片为 Base64
function ConvertTo-Base64Image {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Path))
    return [Convert]::ToBase64String($bytes)
}

Write-Host "正在准备图片..." -ForegroundColor Cyan
$imageBase64 = ConvertTo-Base64Image -Path $ImagePath
$maskBase64 = ConvertTo-Base64Image -Path $MaskPath

# 构建 API 请求
$payload = @{
    init_images = @("data:image/png;base64,$imageBase64")
    mask = "data:image/png;base64,$maskBase64"
    prompt = $Prompt
    negative_prompt = $NegativePrompt
    denoising_strength = $DenoisingStrength
    steps = $Steps
    batch_size = $BatchCount
    width = 512   # 会自动调整为原图尺寸
    height = 512
    mask_blur = 4
    inpainting_fill = 1  # 1=original, 0=fill, 2=latent noise
    inpaint_full_res = $true
    inpaint_full_res_padding = 32
    sampler_name = "DPM++ 2M Karras"
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10

Write-Host "正在调用 SD WebUI API..." -ForegroundColor Cyan
Write-Host "  提示词: $Prompt" -ForegroundColor Gray
Write-Host "  去噪强度: $DenoisingStrength" -ForegroundColor Gray
Write-Host "  生成数量: $BatchCount" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$SDUrl/sdapi/v1/img2img" `
        -Method Post `
        -ContentType "application/json" `
        -Body $jsonPayload `
        -TimeoutSec 300
}
catch {
    if ($_.Exception.Message -match "Unable to connect") {
        throw "无法连接到 SD WebUI，请确保已启动并启用 API (--api 参数)"
    }
    throw $_
}

# 保存生成的图片
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$savedFiles = @()

for ($i = 0; $i -lt $response.images.Count; $i++) {
    $outputPath = Join-Path $OutputDir "inpaint_${timestamp}_$($i + 1).png"
    $imageBytes = [Convert]::FromBase64String($response.images[$i])
    [System.IO.File]::WriteAllBytes($outputPath, $imageBytes)
    $savedFiles += $outputPath
    Write-Host "  已保存: $outputPath" -ForegroundColor Green
}

Write-Host "`n完成! 共生成 $($savedFiles.Count) 张图片" -ForegroundColor Cyan
Write-Host "输出目录: $OutputDir" -ForegroundColor Cyan

# 返回输出文件列表
return $savedFiles
