# WSL 迁移到 D 盘 + 项目迁移方案

> **维护者**: 壮爸
> **创建日期**: 2025-12-19
> **预计耗时**: 10-20 分钟

---

## 背景

| 当前状态 | 位置 | 速度 |
|----------|------|------|
| 项目 | H 盘 (HDD) | ~100 MB/s |
| WSL | C 盘 (NVMe SSD) | ~3000 MB/s |

| 迁移后 | 位置 | 速度 |
|----------|------|------|
| 项目 | WSL 内部 ~/projects/ | ~3000 MB/s |
| WSL | D 盘 (NVMe SSD) | ~3000 MB/s |

**预期提升**: pnpm install 快 10-30 倍，git 操作快 5-10 倍

---

## 前置准备

### 1. 备份重要数据

```powershell
# 在 WSL 中执行，备份你的配置文件
cp ~/.bashrc /mnt/h/backup/
cp ~/.zshrc /mnt/h/backup/ 2>/dev/null
cp -r ~/.ssh /mnt/h/backup/
cp ~/.gitconfig /mnt/h/backup/
```

### 2. 记录当前 WSL 用户名

```bash
# 在 WSL 中执行
whoami
# 记住输出的用户名，后面要用
```

---

## 第一部分：WSL 迁移到 D 盘

> ⚠️ **以下所有命令都在 Windows PowerShell（管理员）中执行，不是 WSL！**

### 步骤 1：创建目录

```powershell
# 创建 D 盘 WSL 目录
New-Item -Path "D:\WSL" -ItemType Directory -Force
New-Item -Path "D:\WSL\Ubuntu-24.04" -ItemType Directory -Force
New-Item -Path "D:\WSL\backup" -ItemType Directory -Force
```

### 步骤 2：关闭 WSL

```powershell
# 关闭所有 WSL 实例
wsl --shutdown

# 确认已关闭
wsl --list --verbose
# 应该显示所有发行版状态为 Stopped
```

### 步骤 3：导出 WSL（约 2-5 分钟）

```powershell
# 导出 Ubuntu 到 tar 文件
wsl --export Ubuntu-24.04 "D:\WSL\backup\ubuntu-24.04.tar"

# 验证导出成功
$file = Get-Item "D:\WSL\backup\ubuntu-24.04.tar"
Write-Host "导出文件大小: $([math]::Round($file.Length / 1GB, 2)) GB"
# 应该 > 1GB，如果是 0 说明失败了
```

### 步骤 4：注销原 WSL

```powershell
# 注销（删除）C 盘上的 WSL
wsl --unregister Ubuntu-24.04

# 确认已删除
wsl --list --verbose
# Ubuntu-24.04 应该不在列表中了
```

### 步骤 5：导入到 D 盘（约 2-5 分钟）

```powershell
# 从备份导入到 D 盘新位置
wsl --import Ubuntu-24.04 "D:\WSL\Ubuntu-24.04" "D:\WSL\backup\ubuntu-24.04.tar"

# 确认导入成功
wsl --list --verbose
# Ubuntu-24.04 应该显示，状态为 Stopped
```

### 步骤 6：设置默认用户

导入后默认用户会变成 root，需要改回你的用户：

```powershell
# 将 YOUR_USERNAME 替换为你之前记录的用户名
# 例如：handazhuang1123

# 方法 A：通过配置文件（推荐）
wsl -d Ubuntu-24.04 -u root bash -c "echo '[user]' > /etc/wsl.conf && echo 'default=YOUR_USERNAME' >> /etc/wsl.conf"

# 重启 WSL 使配置生效
wsl --shutdown
```

### 步骤 7：验证迁移成功

```powershell
# 启动 WSL
wsl -d Ubuntu-24.04

# 在 WSL 中检查
whoami          # 应该是你的用户名，不是 root
pwd             # 应该是你的 home 目录
ls ~            # 应该能看到你的文件
```

### 步骤 8：清理备份（可选）

确认一切正常后：

```powershell
# 删除备份文件，释放空间
Remove-Item "D:\WSL\backup\ubuntu-24.04.tar"
Remove-Item "D:\WSL\backup" -Recurse
```

---

## 第二部分：项目迁移到 WSL 内部

> ⚠️ **以下命令在 WSL 中执行**

### 步骤 1：创建项目目录

```bash
# 在 WSL 中执行
mkdir -p ~/projects
cd ~/projects
```

### 步骤 2：复制项目

```bash
# 从 H 盘复制项目到 WSL
cp -r /mnt/h/HZH/Little-Projects/voice-notification-project ~/projects/

# 验证复制成功
ls -la ~/projects/voice-notification-project
```

### 步骤 3：重新安装依赖

```bash
cd ~/projects/voice-notification-project

# 清理旧的 node_modules（如果有）
rm -rf node_modules
rm -rf modules/*/node_modules
rm -rf packages/*/node_modules
rm -rf portals/*/node_modules

# 重新安装依赖
pnpm install
```

### 步骤 4：验证项目正常

```bash
# 启动开发服务器测试
cd ~/projects/voice-notification-project
pnpm dev

# 或者运行测试
pnpm test
```

### 步骤 5：更新 Git 远程（如需要）

```bash
cd ~/projects/voice-notification-project
git remote -v
# 确认远程仓库地址正确
```

---

## 第三部分：一键迁移脚本（高级）

如果你想自动化整个过程，保存以下内容为 `migrate-wsl.ps1`：

```powershell
#Requires -RunAsAdministrator
# WSL 迁移脚本 - 在 Windows PowerShell (管理员) 中运行
# 用法: .\migrate-wsl.ps1 -Username "你的用户名"

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [string]$DistroName = "Ubuntu-24.04",
    [string]$TargetPath = "D:\WSL\Ubuntu-24.04",
    [string]$BackupPath = "D:\WSL\backup"
)

$ErrorActionPreference = "Stop"

function Write-Step($step, $message) {
    Write-Host "`n[$step] $message" -ForegroundColor Cyan
}

try {
    Write-Step 1 "创建目录..."
    New-Item -Path $TargetPath -ItemType Directory -Force | Out-Null
    New-Item -Path $BackupPath -ItemType Directory -Force | Out-Null

    Write-Step 2 "关闭 WSL..."
    wsl --shutdown
    Start-Sleep -Seconds 2

    Write-Step 3 "导出 WSL（可能需要几分钟）..."
    $backupFile = Join-Path $BackupPath "$DistroName.tar"
    wsl --export $DistroName $backupFile

    $fileSize = (Get-Item $backupFile).Length / 1GB
    if ($fileSize -lt 0.1) {
        throw "导出失败：文件大小为 $([math]::Round($fileSize, 2)) GB"
    }
    Write-Host "导出成功：$([math]::Round($fileSize, 2)) GB"

    Write-Step 4 "注销原 WSL..."
    wsl --unregister $DistroName

    Write-Step 5 "导入到 D 盘（可能需要几分钟）..."
    wsl --import $DistroName $TargetPath $backupFile

    Write-Step 6 "设置默认用户..."
    wsl -d $DistroName -u root bash -c "echo '[user]' > /etc/wsl.conf && echo 'default=$Username' >> /etc/wsl.conf"
    wsl --shutdown
    Start-Sleep -Seconds 2

    Write-Step 7 "验证..."
    $currentUser = wsl -d $DistroName whoami
    if ($currentUser.Trim() -eq $Username) {
        Write-Host "`n✅ 迁移成功！当前用户: $currentUser" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ 用户设置可能有问题，当前用户: $currentUser" -ForegroundColor Yellow
    }

    Write-Step 8 "清理备份文件..."
    Remove-Item $backupFile -Force

    Write-Host "`n🎉 WSL 已成功迁移到 D 盘！" -ForegroundColor Green
    Write-Host "新位置: $TargetPath" -ForegroundColor Green

} catch {
    Write-Host "`n❌ 错误: $_" -ForegroundColor Red
    Write-Host "如果导出文件存在，你可以手动恢复" -ForegroundColor Yellow
    exit 1
}
```

**使用方法**：

```powershell
# 在 Windows PowerShell (管理员) 中运行
.\migrate-wsl.ps1 -Username "handazhuang1123"
```

---

## 常见问题

### Q: 导出文件大小为 0？

**原因**: WSL 没有正确关闭
**解决**:
```powershell
wsl --shutdown
taskkill /F /IM wsl.exe 2>$null
# 等待 10 秒后重试导出
```

### Q: 导入后用户是 root？

**解决**: 重新设置默认用户
```powershell
wsl -d Ubuntu-24.04 -u root bash -c "echo '[user]' > /etc/wsl.conf && echo 'default=你的用户名' >> /etc/wsl.conf"
wsl --shutdown
```

### Q: 项目复制后 pnpm install 报错？

**解决**: 清理并重装
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q: 迁移后 VS Code 连不上 WSL？

**解决**: 重启 VS Code，或在 WSL 中运行 `code .`

---

## 回滚方案

如果迁移失败，且备份文件还在：

```powershell
# 注销失败的导入
wsl --unregister Ubuntu-24.04

# 重新导入到 C 盘原位置
wsl --import Ubuntu-24.04 "C:\Users\Administrator\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu24.04LTS_79rhkp1fndgsc\LocalState" "D:\WSL\backup\ubuntu-24.04.tar"
```

---

## 迁移后的新工作流程

迁移完成后，你的项目路径变为：

```
~/projects/voice-notification-project
```

启动 Claude Code：

```bash
cd ~/projects/voice-notification-project
claude
```

在 VS Code 中打开：

```bash
cd ~/projects/voice-notification-project
code .
```

---

## 验收清单

- [ ] WSL 在 D 盘运行 (`wsl --list --verbose` 显示正常)
- [ ] 默认用户正确 (`whoami` 显示你的用户名)
- [ ] 项目在 WSL 内部 (`ls ~/projects/voice-notification-project`)
- [ ] pnpm install 成功
- [ ] 开发服务器能启动
- [ ] Git 操作正常

---

**祝迁移顺利！** 🚀
