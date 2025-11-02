# 使用说明

## 快速上手

### 第一步：部署文件

将项目复制到你的工作目录：
```bash
cp -r voice-notification-project /path/to/your/project/
```

### 第二步：测试语音

测试 Windows TTS 是否正常：
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('测试语音')"
```

### 第三步：开始使用

1. 在项目目录打开 Claude Code
2. 输入任意问题，例如："帮我创建一个配置文件"
3. Claude 完成后自动播报

## 常见使用场景

### 场景 1：文档创建

**用户输入：**
```
帮我在根目录创建一个Word文档名为项目报告
```

**播报内容：**
```
我已完成文档创建工作，生成了名为 项目报告 的文件
```

### 场景 2：代码优化

**用户输入：**
```
优化这个 hook 脚本的性能
```

**播报内容：**
```
我已完成代码优化工作
```

### 场景 3：文件清理

**用户输入：**
```
删除所有测试文件
```

**播报内容：**
```
我已完成文件清理工作，删除了不需要的测试文件
```

## 自定义配置

### 修改播报文本

编辑 `.claude/hooks/voice-templates.json`：

```json
{
  "templates": {
    "document_creation": "文档已创建完成",
    "code_optimization": "代码优化已完成"
  }
}
```

### 添加新关键词

在 `voice-templates.json` 的 `keywords` 部分添加：

```json
{
  "keywords": {
    "document_creation": ["创建", "生成", "新建", "Word", "Excel"]
  }
}
```

### 调整语音速度

编辑 `voice-notification.ps1` 第 201 行：

```powershell
$voice.Rate = -1    # -10(最慢) 到 10(最快), 默认 0
```

### 调整音量

编辑 `voice-notification.ps1` 第 200 行：

```powershell
$voice.Volume = 100  # 0(静音) 到 100(最大)
```

## 查看日志

### 查看调试日志

```powershell
# 查看最后 50 行
Get-Content .claude\hooks\voice-debug.log -Tail 50 -Encoding UTF8

# 实时监控
Get-Content .claude\hooks\voice-debug.log -Wait -Tail 10 -Encoding UTF8
```

### 查看播报历史

```powershell
Get-Content .claude\hooks\voice-notifications.log -Encoding UTF8
```

## 禁用/启用

### 临时禁用

重命名或移除 `settings.json` 中的 Stop hook 配置：

```json
{
  "hooks": {
    // "Stop": [...]  ← 注释掉
  }
}
```

### 永久删除

删除 `.claude/hooks/` 目录

## 性能优化

### 减少执行时间

1. 关闭调试日志（修改脚本，移除所有 `Write-DebugLog` 调用）
2. 减少 transcript 读取行数（修改循环逻辑）

### 异步播放

当前已使用 `Start-Job` 异步播放，无需额外配置。

## 故障排查命令

```powershell
# 检查脚本语法
powershell -NoProfile -ExecutionPolicy Bypass -File .claude\hooks\voice-notification.ps1

# 手动测试（需要准备 test-input.json）
cat test-input.json | powershell -ExecutionPolicy Bypass -File .claude\hooks\voice-notification.ps1

# 查看错误日志
Get-Content .claude\hooks\voice-notification-errors.log -Encoding UTF8
```

## 高级用法

### 集成其他通知方式

在脚本末尾添加其他通知（如桌面通知、邮件等）：

```powershell
# 桌面通知（Windows 10+）
Add-Type -AssemblyName System.Windows.Forms
$notification = New-Object System.Windows.Forms.NotifyIcon
$notification.Icon = [System.Drawing.SystemIcons]::Information
$notification.BalloonTipText = $summary
$notification.Visible = $true
$notification.ShowBalloonTip(3000)
```

### 多语言支持

复制 `voice-templates.json` 为 `voice-templates-en.json`，修改为英文模板，然后在脚本中根据环境变量选择加载。

---

更多问题请参考 `README.md` 或提交 Issue。
