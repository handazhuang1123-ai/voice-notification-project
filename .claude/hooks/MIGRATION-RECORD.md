# Voice-Summary Hook 迁移记录

> 迁移日期: 2025-01-17
> 修复日期: 2025-12-17
> 迁移类型: 项目级 → 系统级
> 执行者: Claude Code (Opus 4.5)

---

## 一、迁移概述

### 1.1 迁移目标

将 `voice-summary` 语音播报扩展从项目级 hook 迁移到系统级 hook，实现：
- 所有 Claude Code 项目共享语音播报功能
- 支持按项目分目录存储日志
- 全局统一配置（已移除项目级配置覆盖功能）
- 路径与目录结构解耦，便于后续迁移

### 1.2 迁移前后对比

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| 配置位置 | 项目 `.claude/settings.json` | 系统 `~/.claude/settings.json` |
| 扩展位置 | 项目 `.claude/hooks/extensions/` | 系统 `~/.claude/hooks/extensions/` |
| 生效范围 | 仅当前项目 | 所有项目 |
| 日志存储 | 单一文件 | 按项目分目录 |
| 配置定制 | 固定配置 | 全局统一配置 |

---

## 二、目录结构

### 2.1 系统级目录（迁移后）

```
C:\Users\Administrator\.claude\
├── settings.json                   # 系统配置（已添加 Stop hook）
└── hooks/
    ├── dispatcher.ps1              # 调度器入口
    ├── convert-to-utf8bom.ps1      # 原有 UTF-8 BOM 转换
    ├── statusline.ps1              # 状态栏脚本
    └── extensions/
        └── voice-summary/
            ├── bootstrap.ps1       # 【核心】路径配置中心
            ├── config.json         # 扩展启用开关
            ├── voice-config.json   # 系统默认语音配置
            ├── voice-summary.ps1   # 主脚本
            ├── helpers/
            │   ├── Extract-Messages.ps1
            │   ├── Generate-Summary.ps1
            │   ├── Play-EdgeTTS.ps1
            │   └── New-SSML.ps1
            ├── modules/            # 内嵌模块（不再依赖外部）
            │   ├── Logger.psm1
            │   ├── ErrorMonitor.psm1
            │   └── Invoke-PlayAudio.psm1
            ├── data/
            │   └── error-stats.json
            └── logs/               # 按项目分目录（使用 Claude Code 项目目录名）
                ├── H--HZH-Little-Projects-voice-notification-project/
                │   └── voice-unified.log
                └── default/
                    └── voice-unified.log
```

### 2.2 项目级目录（迁移后状态）

```
H:\HZH\Little-Projects\voice-notification-project\.claude\
├── settings.json                   # 项目配置
├── CLAUDE.md                       # 项目指令
└── hooks/
    ├── MIGRATION-RECORD.md         # 本文档
    ├── dispatcher.ps1              # 保留（但不再被系统级触发）
    └── extensions/
        └── voice-summary/
            ├── config.json         # 【已禁用】enabled: false
            └── ...                 # 其他文件保留作为备份
```

---

## 三、关键改动

### 3.1 bootstrap.ps1

**位置**: `C:\Users\Administrator\.claude\hooks\extensions\voice-summary\bootstrap.ps1`

**作用**: 路径配置中心，所有脚本首先加载此文件

**核心功能**:
```powershell
# 自动探测扩展根目录
$script:ExtensionRoot = Get-ExtensionRoot

# 全局路径变量
$script:ModulesPath   = Join-Path $script:ExtensionRoot "modules"
$script:LogsPath      = Join-Path $script:ExtensionRoot "logs"
$script:DataPath      = Join-Path $script:ExtensionRoot "data"
$script:HelpersPath   = Join-Path $script:ExtensionRoot "helpers"

# 项目信息提取（从 Claude Code 的 projects 目录名）
Get-ProjectInfo -TranscriptPath $path  # 返回 ProjectName

# 获取系统级配置
Get-VoiceConfig
```

### 3.2 Logger.psm1 改动

**新增功能**: 支持分项目日志 + 环境变量传递

```powershell
# 模块初始化时从环境变量读取项目名
$script:CurrentProjectName = if ($env:VOICE_PROJECT_NAME) { $env:VOICE_PROJECT_NAME } else { "default" }

# Set-LogProject 同时设置模块变量和环境变量
function Set-LogProject {
    $script:CurrentProjectName = $ProjectName
    $env:VOICE_PROJECT_NAME = $ProjectName  # 确保子进程也能读取
}
```

### 3.3 New-SSML.ps1 改动

**修复**: 移除不支持的 `mstts:express-as` 情感标签

```xml
<!-- 修复前（Node.js edge-tts 不支持） -->
<speak>
  <voice name="...">
    <mstts:express-as style="cheerful">
      <prosody>...</prosody>
    </mstts:express-as>
  </voice>
</speak>

<!-- 修复后（简化 SSML） -->
<speak>
  <voice name="...">
    <prosody rate="..." pitch="..." volume="...">
      ...
    </prosody>
  </voice>
</speak>
```

### 3.4 settings.json 改动

**系统级** (`C:\Users\Administrator\.claude\settings.json`):
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File \"C:\\Users\\Administrator\\.claude\\hooks\\dispatcher.ps1\""
          }
        ]
      }
    ]
  }
}
```

---

## 四、配置说明

### 4.1 系统默认配置

**文件**: `C:\Users\Administrator\.claude\hooks\extensions\voice-summary\voice-config.json`

```json
{
    "Voice": "zh-CN-YunyangNeural",
    "Rate": -8,
    "Pitch": 1,
    "Volume": 85,
    "StyleDegree": 1.2,
    "UseSSML": true,
    "EmotionSettings": {
        "UseAutoDetection": true,
        "DefaultEmotion": "assistant",
        "AutoMapping": {
            "Success": "cheerful",
            "Error": "calm",
            "Warning": "serious",
            "Question": "gentle"
        }
    }
}
```

> **注意**: `EmotionSettings` 配置目前仅用于情感检测，实际情感风格不会应用到语音（见下方"已知限制"）。

---

## 五、调试指南

### 5.1 验证 bootstrap 加载

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    . 'C:\Users\Administrator\.claude\hooks\extensions\voice-summary\bootstrap.ps1'
    Write-Host 'ExtensionRoot:' `$script:ExtensionRoot
    Write-Host 'ModulesPath:' `$script:ModulesPath
"
```

### 5.2 查看日志

```powershell
# 查看特定项目日志
Get-Content "C:\Users\Administrator\.claude\hooks\extensions\voice-summary\logs\H--HZH-Little-Projects-voice-notification-project\voice-unified.log" -Tail 50

# 实时监控
Get-Content "C:\Users\Administrator\.claude\hooks\extensions\voice-summary\logs\H--HZH-Little-Projects-voice-notification-project\voice-unified.log" -Wait
```

### 5.3 检查扩展状态

```powershell
# 检查扩展是否启用
Get-Content "C:\Users\Administrator\.claude\hooks\extensions\voice-summary\config.json"
# 应显示: {"enabled": true}
```

---

## 六、已知限制

### 6.1 情感风格不生效

**现象**: 配置中的 `EmotionSettings` 能检测情感类型，但语音播放时不会应用情感风格。

**原因**: 当前使用的 Node.js 版 `@andresaya/edge-tts` 不支持微软专有的 `mstts:express-as` SSML 标签。

**影响**: 语音只能控制语速、音调、音量，无法表达 cheerful、calm、serious 等情感风格。

**当前状态**: SSML 已简化，移除情感标签，确保语音合成正常工作。

---

## 七、后续拓展计划：情感风格支持

### 7.1 方案对比

| 方案 | 实现方式 | 优点 | 缺点 |
|------|----------|------|------|
| **A. Python edge-tts** | 安装 `pip install edge-tts`，修改调用方式 | 完整支持情感风格 | 需要 Python 环境 |
| **B. Azure Speech Service** | 使用 Azure 官方 API | 最完整的功能支持 | 需要 Azure 订阅，有费用 |
| **C. 本地 TTS 引擎** | 使用 Windows SAPI 或其他本地引擎 | 无网络依赖 | 情感表达能力有限 |

### 7.2 推荐方案：Python edge-tts

**步骤**:
1. 安装 Python edge-tts: `pip install edge-tts`
2. 修改 `Play-EdgeTTS.ps1`，调用 Python 版命令
3. 恢复 `New-SSML.ps1` 中的 `mstts:express-as` 标签

**Python edge-tts 命令格式**:
```bash
# 使用 SSML 文件
edge-tts --file input.xml --write-media output.mp3

# 或直接使用文本 + 参数
edge-tts --voice zh-CN-YunyangNeural --text "文本" --write-media output.mp3
```

### 7.3 实施优先级

1. **P0 (已完成)**: 基础语音播报功能正常工作
2. **P1 (待实施)**: 支持情感风格（需要 Python edge-tts）
3. **P2 (可选)**: 支持更多语音角色和语言

---

## 八、修复历史

### 2025-12-17 修复

1. **日志分散问题**: 修复 Logger.psm1，使用环境变量 `$env:VOICE_PROJECT_NAME` 在子进程间传递项目名
2. **SSML 失败问题**: 简化 New-SSML.ps1，移除 Node.js edge-tts 不支持的 `mstts:express-as` 标签
3. **项目名提取**: 修改 Get-ProjectInfo，直接使用 Claude Code 的 projects 目录名作为项目标识
4. **配置简化**: 移除项目级配置覆盖功能，统一使用系统级配置

---

**维护者**: 壮爸
**最后更新**: 2025-12-17
