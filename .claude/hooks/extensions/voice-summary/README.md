# Voice Summary Extension

> Claude Code 语音播报扩展 - 智能总结 + 情感语音 + 可视化配置

## 📋 简介

为 Claude Code 提供智能语音播报功能的扩展模块，在每次对话结束后自动生成AI总结并语音播报。

## ✨ 核心功能

### 1. AI智能总结
- **本地AI** - Ollama qwen2.5:7b-instruct 模型
- **个性化** - 根据对话内容生成专属总结
- **简洁高效** - 50字以内，适合语音播报

### 2. SSML情感语音
- **高品质TTS** - Edge-TTS 中文语音（云希/晓晓）
- **情感表达** - cheerful/calm/serious/gentle/assistant
- **参数可调** - 语速、音调、音量、情感强度

### 3. 可视化配置
- **WPF界面** - 图形化配置所有参数
- **实时试听** - 即时预览配置效果
- **场景定制** - Success/Error/Warning/Question 独立配置

## 🏗️ 扩展架构

```
voice-summary/
├── config.json                 # 扩展启用开关 {"enabled": true}
├── voice-config.json           # 语音配置参数
├── voice-summary.ps1           # 主脚本（调度器入口）
├── Show-VoiceConfigUI.ps1      # WPF配置界面
├── VoiceConfigUI.xaml          # 界面定义
├── helpers/
│   ├── Extract-Messages.ps1    # 消息提取模块
│   ├── Generate-Summary.ps1    # AI总结生成模块
│   ├── Play-EdgeTTS.ps1        # Edge-TTS播放模块（SSML支持）
│   └── New-SSML.ps1            # SSML生成模块
└── logs/
    └── voice-unified.log       # 统一日志文件
```

## 🚀 快速使用

### 启用/禁用扩展

```powershell
# 启用扩展
echo '{"enabled": true}' > config.json

# 禁用扩展
echo '{"enabled": false}' > config.json
```

### 打开配置界面

```powershell
# 方式1：使用项目根目录快捷方式
.\打开语音配置界面.vbs

# 方式2：直接运行脚本
powershell -ExecutionPolicy Bypass -File ".\Show-VoiceConfigUI.ps1"
```

### 查看运行日志

```powershell
# 查看最近50行
cat logs\voice-unified.log -Tail 50

# 实时监控
Get-Content logs\voice-unified.log -Wait
```

## ⚙️ 配置说明

### voice-config.json

```json
{
  "Voice": "zh-CN-YunxiNeural",           // 语音角色
  "Rate": -8,                             // 语速 (-50 到 +50)
  "Pitch": 1,                             // 音调 (-50 到 +50)
  "Volume": 85,                           // 音量 (0 到 100)
  "StyleDegree": 1.2,                     // 情感强度 (0.01 到 2.0)
  "UseSSML": true,                        // 启用SSML
  "EmotionSettings": {
    "UseAutoDetection": true,             // 自动情感检测
    "DefaultEmotion": "assistant",        // 默认情感
    "AutoMapping": {
      "Success": "cheerful",              // 成功场景
      "Error": "calm",                    // 错误场景
      "Warning": "serious",               // 警告场景
      "Question": "gentle"                // 询问场景
    }
  }
}
```

### 可用语音角色

| 角色 | ID | 特点 |
|------|---------|------|
| 云希（男声）| zh-CN-YunxiNeural | 自然男声，专业稳重 |
| 晓晓（女声）| zh-CN-XiaoxiaoNeural | 温柔女声，亲切自然 |
| 晓伊（女声）| zh-CN-XiaoyiNeural | 活泼女声，年轻活力 |
| 云扬（男声）| zh-CN-YunyangNeural | 新闻播报，庄重大气 |

### 支持的情感风格

| 情感 | 适用场景 |
|------|----------|
| cheerful | 成功、完成、积极反馈 |
| calm | 错误提示、平静说明 |
| serious | 警告、重要通知 |
| gentle | 询问、建议 |
| assistant | 日常对话、中性播报 |

## 🔧 工作流程

```
dispatcher.ps1 调用 voice-summary.ps1
    ↓
1. Extract-Messages.ps1
   └─ 从 transcript.jsonl 提取最后一轮对话
    ↓
2. Generate-Summary.ps1
   ├─ Ollama API 调用
   ├─ Prompt: 生成50字总结
   └─ 超时3秒自动降级
    ↓
3. 情感检测
   ├─ 检测 Success/Error/Warning/Question
   └─ 映射到对应情感风格
    ↓
4. New-SSML.ps1
   ├─ 生成SSML标记
   ├─ 嵌入情感、语速、音调参数
   └─ 返回XML格式
    ↓
5. Play-EdgeTTS.ps1
   ├─ 调用 Edge-TTS 生成MP3
   ├─ MediaPlayer 播放音频
   └─ 记录监控数据
```

## 📊 性能指标

| 模块 | 耗时 | 说明 |
|------|------|------|
| 消息提取 | 50-200ms | transcript 读取和解析 |
| AI总结 | 0.5-2s | Ollama API 调用 |
| 情感检测 | 10ms | 关键词匹配 |
| SSML生成 | 10-30ms | XML 字符串拼接 |
| 语音合成 | 0.3-1s | Edge-TTS 网络请求 |
| 音频播放 | 2-5s | 实际播报时长 |
| **总计** | **3-8s** | 完整流程 |

## 🐛 故障排查

### 1. 扩展未执行

```powershell
# 检查扩展是否启用
cat config.json
# 应显示: {"enabled": true}

# 检查dispatcher日志
cat ..\..\logs\dispatcher.log -Tail 20
```

### 2. Edge-TTS失败

```powershell
# 测试Edge-TTS命令
edge-tts --version

# 手动测试
edge-tts synthesize -t "测试" -v zh-CN-YunxiNeural -o test
```

### 3. Ollama失败

```powershell
# 检查Ollama服务
ollama list

# 测试模型
ollama run qwen2.5:7b-instruct "你好"

# 查看日志中的Ollama错误
cat logs\voice-unified.log | Select-String "Ollama"
```

### 4. 配置界面打开失败

```powershell
# 直接运行（查看错误信息）
powershell -ExecutionPolicy Bypass -NoExit -File ".\Show-VoiceConfigUI.ps1"

# 检查XAML文件是否存在
Test-Path .\VoiceConfigUI.xaml
```

## 📝 日志格式

```
[2025-11-16 01:42:30.033] [INFO] [voice-summary.ps1] FINAL SUMMARY: 先生,配置文件路径不统一的问题已修复
[2025-11-16 01:42:30.039] [INFO] [voice-summary.ps1] Detected emotion style: cheerful
[2025-11-16 01:42:30.041] [DEBUG] [voice-summary.ps1] Loaded voice from config: zh-CN-YunxiNeural
[2025-11-16 01:42:30.054] [DEBUG] [Play-EdgeTTS.ps1] Voice: zh-CN-YunxiNeural
[2025-11-16 01:42:30.055] [DEBUG] [Play-EdgeTTS.ps1] Emotion Style: cheerful
[2025-11-16 01:42:50.163] [INFO] [voice-summary.ps1] edge-tts playback successful
```

## 🎨 自定义开发

### 修改AI提示词

编辑 `helpers/Generate-Summary.ps1`：

```powershell
# 找到 $promptTemplate 变量
$promptTemplate = @"
用户请求：{0}
Claude的回复：{1}

要求:
1. 开头用"先生,"
2. 只描述"已完成"的动作
3. 提取最重要的1个数字或结果
...
"@
```

### 添加新情感风格

1. 编辑 `voice-config.json` 添加映射
2. 确保语音角色支持该情感（不是所有角色支持所有情感）

### 修改字数限制

编辑 `helpers/Generate-Summary.ps1`：

```powershell
# Ollama API 调用参数
$requestBody = @{
    num_predict = 50  # 修改为其他值
    ...
} | ConvertTo-Json
```

## 📚 依赖模块

### 外部依赖
- **Ollama** - AI总结生成
- **Edge-TTS** - 语音合成
- **Node.js** - Edge-TTS运行环境

### 内部模块
- **Logger.psm1** - 统一日志系统
- **ErrorMonitor.psm1** - 错误监控
- **Invoke-PlayAudio.psm1** - 音频播放

## 🔄 版本历史

### v3.0 (2025-01-16)
- ✨ 重构为dispatcher扩展架构
- 🎭 SSML情感表达支持
- 🖥️ WPF可视化配置界面
- 📊 集成错误监控系统
- 🔧 config.json和voice-config.json分离

### v2.5 (2025-01-11)
- 🎤 Edge-TTS替代Python版本
- 📝 统一日志系统（voice-unified.log）
- 🎨 情感自动检测

### v2.0 (2025-01-07)
- 🤖 接入Ollama AI
- 🎵 SSML支持
- 📁 模块化架构

### v1.0 (2025-11-02)
- 🎯 基础语音播报
- 📋 关键词模板匹配

---

**Voice Summary Extension** - 让AI会说话！🎤
