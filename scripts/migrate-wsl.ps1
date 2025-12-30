#Requires -RunAsAdministrator
param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    [string]$DistroName = "Ubuntu-24.04",
    [string]$TargetPath = "D:\WSL\Ubuntu-24.04",
    [string]$BackupPath = "D:\WSL\backup"
)

$ErrorActionPreference = "Stop"

function Write-Step($step, $message) {
    Write-Host ""
    Write-Host "[$step] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host $message -ForegroundColor Green
}

try {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "   WSL 迁移脚本 - 迁移到 D 盘" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "配置: 用户=$Username, 发行版=$DistroName"
    Write-Host ""

    # 步骤 1: 创建目录
    Write-Step 1 "创建目录..."
    New-Item -Path $TargetPath -ItemType Directory -Force | Out-Null
    New-Item -Path $BackupPath -ItemType Directory -Force | Out-Null
    Write-Success "  目录创建成功"

    # 步骤 2: 关闭 WSL
    Write-Step 2 "关闭 WSL..."
    wsl --shutdown
    Start-Sleep -Seconds 3
    Write-Success "  WSL 已关闭"

    # 步骤 3: 导出 WSL
    Write-Step 3 "导出 WSL（可能需要 2-5 分钟）..."
    $backupFile = Join-Path $BackupPath "$DistroName.tar"
    $exportStart = Get-Date
    wsl --export $DistroName $backupFile
    $exportTime = (Get-Date) - $exportStart

    if (-not (Test-Path $backupFile)) {
        throw "导出失败：备份文件不存在"
    }

    $fileSize = (Get-Item $backupFile).Length / 1GB
    if ($fileSize -lt 0.1) {
        throw "导出失败：文件大小异常"
    }
    Write-Success "  导出成功: $([math]::Round($fileSize, 2)) GB (耗时 $([math]::Round($exportTime.TotalSeconds)) 秒)"

    # 步骤 4: 注销原 WSL
    Write-Step 4 "注销原 WSL..."
    wsl --unregister $DistroName
    Write-Success "  原 WSL 已注销"

    # 步骤 5: 导入到 D 盘
    Write-Step 5 "导入到 D 盘（可能需要 2-5 分钟）..."
    $importStart = Get-Date
    wsl --import $DistroName $TargetPath $backupFile
    $importTime = (Get-Date) - $importStart
    Write-Success "  导入成功 (耗时 $([math]::Round($importTime.TotalSeconds)) 秒)"

    # 步骤 6: 设置默认用户
    Write-Step 6 "设置默认用户为 $Username..."
    wsl -d $DistroName -u root bash -c "echo '[user]' > /etc/wsl.conf; echo 'default=$Username' >> /etc/wsl.conf"
    wsl --shutdown
    Start-Sleep -Seconds 2
    Write-Success "  用户设置完成"

    # 步骤 7: 验证
    Write-Step 7 "验证迁移结果..."
    $currentUser = (wsl -d $DistroName whoami).Trim()

    if ($currentUser -eq $Username) {
        Write-Success "  用户验证通过: $currentUser"
    } else {
        Write-Host "  警告: 当前用户是 $currentUser，期望 $Username" -ForegroundColor Yellow
    }

    wsl --list --verbose

    # 步骤 8: 清理备份
    Write-Step 8 "清理备份文件..."
    Remove-Item $backupFile -Force
    Write-Success "  备份文件已删除"

    # 完成
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   迁移成功完成!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "新位置: $TargetPath" -ForegroundColor Green
    Write-Host "默认用户: $Username" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：在 WSL 中执行项目迁移命令" -ForegroundColor Yellow

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   迁移失败!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}
