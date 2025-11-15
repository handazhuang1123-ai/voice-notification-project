# Voice Notification Project

> Claude Code 智能语音助手 - AI总结 + 情感语音播报 + 错误监控 + 向量记忆

## 🎯 项目简介

为 Claude Code 添加智能语音播报功能，在每次对话结束后自动生成个性化总结并语音播报。

### ✨ 核心特性

- 🎤 **智能语音播报** - Edge-TTS 高品质中文语音（云希/晓晓）
- 🤖 **AI智能总结** - Ollama 本地AI生成个性化播报内容
- 🎭 **情感表达** - SSML情感风格（cheerful/calm/serious等）
- 📊 **错误监控** - 实时统计组件调用和错误，可视化监控面板
- 🧠 **向量记忆** - SQLite-vec RAG系统，记录对话历史
- 🔧 **可视化配置** - WPF配置界面，实时试听

## 🏗️ 系统架构

```
voice-notification-project/
├── .claude/
│   ├── settings.json                       # Claude Code Hook配置
│   ├── hooks/
│   │   ├── dispatcher.ps1                  # 统一调度器（主入口）
│   │   ├── Show-ErrorDashboard.ps1         # 错误监控面板
│   │   └── extensions/
│   │       └── voice-summary/              # 语音播报扩展
│   │           ├── config.json             # 扩展启用开关
│   │           ├── voice-config.json       # 语音参数配置
│   │           ├── voice-summary.ps1       # 扩展主脚本
│   │           ├── Show-VoiceConfigUI.ps1  # 配置界面
│   │           ├── VoiceConfigUI.xaml      # WPF界面定义
│   │           └── helpers/                # 辅助模块
│   │               ├── Extract-Messages.ps1    # 消息提取
│   │               ├── Generate-Summary.ps1    # AI总结生成
│   │               ├── Play-EdgeTTS.ps1        # 语音播放（SSML支持）
│   │               └── New-SSML.ps1            # SSML生成
│   ├── modules/
│   │   ├── ErrorMonitor.psm1               # 错误监控模块
│   │   ├── Logger.psm1                     # 统一日志模块
│   │   ├── VectorMemory.psm1               # 向量记忆模块
│   │   ├── Invoke-PlayAudio.psm1           # 音频播放模块
│   │   └── StringAlignment.psm1            # 中文字符对齐
│   └── data/
│       ├── error-stats.json                # 错误统计数据
│       └── memory.db                       # 向量记忆数据库
├── lib/                                    # SQLite依赖库
├── modules/                                # 项目模块
├── scripts/                                # 工具脚本
├── tests/                                  # 测试脚本
├── 错误监控面板.lnk                        # 监控面板快捷方式
└── 打开语音配置界面.vbs                     # 配置界面快捷方式
```

## 🚀 快速开始

### 1. 环境要求

| 组件 | 版本 | 用途 |
|------|------|------|
| Windows | 10/11 | 运行环境 |
| PowerShell | 5.1+ | 脚本执行 |
| Ollama | latest | AI总结生成 |
| Node.js | 14+ | Edge-TTS运行环境 |

### 2. 安装依赖

```powershell
# 1. 安装 Ollama（从 https://ollama.ai 下载）

# 2. 拉取中文模型（推荐 qwen2.5:7b-instruct）
ollama pull qwen2.5:7b-instruct

# 3. 安装 Edge-TTS（Node.js版本）
npm install -g @andresaya/edge-tts

# 4. 安装 SQLite 依赖（可选，用于向量记忆）
.\scripts\Install-Dependencies.ps1
```

### 3. 启用语音播报

项目已配置好，直接使用 Claude Code 即可：

```powershell
# 进入项目目录
cd H:\HZH\Little-Projects\voice-notification-project

# 使用 Claude Code 进行对话
# 每次对话结束后会自动语音播报
```

### 4. 配置语音参数

```powershell
# 方式1：双击快捷方式
.\打开语音配置界面.vbs

# 方式2：手动运行
powershell -ExecutionPolicy Bypass -File ".claude\hooks\extensions\voice-summary\Show-VoiceConfigUI.ps1"
```

**可配置项**：
- 语音角色（云希/晓晓等）
- 语速、音调、音量
- 情感风格强度
- 默认情感和场景情感映射

## 📊 错误监控系统

### 启动监控面板

```powershell
# 方式1：双击快捷方式
.\错误监控面板.lnk

# 方式2：手动运行
powershell -ExecutionPolicy Bypass -File ".claude\hooks\Show-ErrorDashboard.ps1"
```

### 监控内容

- **总览统计** - 总调用数、总错误数、错误率、健康状态
- **组件分布** - AI、TTS、Extract、Other 各组件错误占比
- **错误类型** - 超时、网络错误、格式错误等排行
- **最近错误** - 时间线显示最近10条错误详情

### 健康状态评级

| 错误率 | 状态 | 说明 |
|--------|------|------|
| 0% | Perfect | 完美运行 |
| < 5% | Healthy | 健康状态 |
| 5-10% | Normal | 正常运行 |
| 10-20% | Warning | 需要关注 |
| > 20% | Critical | 严重问题 |

## 🧠 向量记忆系统

### 功能说明

基于 SQLite-vec 的 RAG 向量记忆系统，自动记录对话历史：

- **自动存储** - 每次对话自动存储用户消息和 Claude 回复
- **向量检索** - 基于语义相似度检索历史对话
- **知识积累** - 构建个人知识库，提升对话质量

### 初始化数据库

```powershell
.\scripts\Initialize-MemoryDatabase.ps1
```

### 使用方法

```powershell
# 导入模块
Import-Module .\modules\VectorMemory.psm1

# 存储对话
Add-ConversationMemory -UserMessage "用户消息" -AssistantReply "Claude回复"

# 检索相关历史
Search-ConversationMemory -Query "搜索关键词" -TopK 5
```

## 🎭 情感表达系统

### 支持的情感风格

| 场景 | 默认情感 | 说明 |
|------|----------|------|
| Success | cheerful | 欢快的，用于成功完成任务 |
| Error | calm | 平静的，用于错误提示 |
| Warning | serious | 严肃的，用于警告信息 |
| Question | gentle | 温和的，用于询问 |
| Default | assistant | 助手风格，专业自然 |

### 自定义情感映射

编辑 `voice-config.json`：

```json
{
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

## 🔧 工作流程

```
用户发送消息 → Claude 回复 → Stop Hook 触发
    ↓
dispatcher.ps1 读取 stdin
    ↓
遍历扩展目录 → 检查 config.json → 执行 voice-summary.ps1
    ↓
Extract-Messages → 提取用户消息和 Claude 回复
    ↓
Generate-Summary → Ollama AI 生成总结（50字以内）
    ↓
检测情感风格（Success/Error/Warning/Question）
    ↓
New-SSML → 生成 SSML（包含情感、语速、音调）
    ↓
Play-EdgeTTS → Edge-TTS 生成音频 → 播放
    ↓
Record-Call/Record-Error → 记录监控数据
    ↓
Add-ConversationMemory → 存储到向量数据库
```

## 📝 配置文件说明

### .claude/settings.json

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "powershell -ExecutionPolicy Bypass -File \".claude\\hooks\\dispatcher.ps1\""
      }]
    }]
  }
}
```

### voice-config.json

```json
{
  "Voice": "zh-CN-YunxiNeural",
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

## 🐛 故障排查

### 1. 没有语音播报

```powershell
# 检查扩展是否启用
cat .claude\hooks\extensions\voice-summary\config.json
# 应该显示: {"enabled": true}

# 查看日志
cat .claude\hooks\extensions\voice-summary\logs\voice-unified.log -Tail 50
```

### 2. Edge-TTS 安装失败

```powershell
# 检查 Node.js 版本
node -v

# 重新安装
npm uninstall -g @andresaya/edge-tts
npm install -g @andresaya/edge-tts

# 验证安装
edge-tts --version
```

### 3. Ollama 总结失败

```powershell
# 检查 Ollama 服务
ollama list

# 测试模型
ollama run qwen2.5:7b-instruct "你好"

# 查看日志
cat .claude\hooks\extensions\voice-summary\logs\voice-unified.log | Select-String "Ollama"
```

### 4. 配置界面无法打开

```powershell
# 直接运行脚本
powershell -ExecutionPolicy Bypass -File ".claude\hooks\extensions\voice-summary\Show-VoiceConfigUI.ps1"

# 查看错误信息
```

## 📊 性能指标

| 指标 | 数值 | 说明 |
|------|------|------|
| 消息提取 | 50-200ms | 从 transcript 提取对话 |
| AI总结 | 0.5-2s | Ollama qwen2.5:7b-instruct |
| SSML生成 | 10-30ms | 生成情感标记 |
| 语音合成 | 0.3-1s | Edge-TTS 网络请求 |
| 音频播放 | 2-5s | 实际播报时长 |
| **总响应时间** | **3-8s** | 从触发到开始播放 |

## 🔒 隐私和安全

- ✅ **本地AI** - Ollama 本地运行，无需云端API
- ✅ **数据隔离** - 所有数据存储在本地项目目录
- ✅ **只读模式** - 只读取 transcript，不修改任何文件
- ✅ **错误静默** - 错误不影响 Claude Code 正常工作

## 📈 扩展开发

### 创建新扩展

```powershell
# 1. 创建扩展目录
mkdir .claude\hooks\extensions\my-extension

# 2. 创建配置文件
echo '{"enabled": true}' > .claude\hooks\extensions\my-extension\config.json

# 3. 创建主脚本
# .claude\hooks\extensions\my-extension\my-extension.ps1
```

### 扩展模板

```powershell
#Requires -Version 5.1

param()

$ErrorActionPreference = "SilentlyContinue"

# 读取 stdin（由 dispatcher 传入）
$inputData = @($input) -join "`n"

# 处理逻辑
Write-Host "Extension executed with input: $inputData"

exit 0
```

## 📚 相关文档

- [测试指南](tests/README.md) - 测试系统使用说明
- [PowerShell最佳实践](docs/PowerShell项目标准化最佳实践调研报告.md)
- [向量记忆使用指南](docs/VectorMemory使用指南.md)
- [Claude扩展架构](docs/Claude扩展架构实施方案.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📜 版本历史

### v3.0 (2025-01-16)
- ✨ 重构为扩展架构（dispatcher + extensions）
- 🎭 添加 SSML 情感表达支持
- 🖥️ WPF 可视化配置界面
- 📊 完整错误监控系统
- 🧠 向量记忆系统（SQLite-vec）

### v2.0 (2025-01-11)
- 🤖 集成 Ollama AI 智能总结
- 🎤 Edge-TTS 高品质语音
- 📝 统一日志系统

### v1.0 (2025-11-02)
- 🎯 基础语音播报功能
- 📋 关键词模板匹配

---

**壮爸的智能语音助手** - 让 Claude Code 会说话！🎤
