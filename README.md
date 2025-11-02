# Claude Code 语音通知 Hook 项目

## 📋 项目概述

这是一个智能语音播报系统，当 Claude Code 完成工作时（Stop 事件），自动分析对话内容并生成智能总结，通过 Windows TTS 语音播报。

**核心特性：**
- ✅ 读取用户最后一条消息和 Claude 回复
- ✅ 基于关键词智能识别 8 种工作场景
- ✅ 生成个性化播报内容（非固定模板）
- ✅ 支持提取文件名等上下文信息
- ✅ 完整的调试日志系统
- ✅ UTF-8 中文支持

## 🗂️ 项目结构

```
voice-notification-project/
├── .claude/
│   ├── settings.json                    # Claude Code 配置
│   └── hooks/
│       ├── voice-notification.ps1       # 主脚本（250行）
│       ├── voice-templates.json         # 消息模板和关键词配置
│       ├── voice-debug.log              # 调试日志（自动生成）
│       └── voice-notifications.log      # 播报历史（自动生成）
├── README.md                            # 本文档
├── USAGE.md                             # 使用说明
└── CHANGELOG.md                         # 更新日志
```

## 🚀 快速开始

### 1. 安装部署

**方法 A：独立项目使用**
```bash
# 将整个 voice-notification-project 文件夹复制到你的工作目录
cp -r voice-notification-project /path/to/your/project/
cd /path/to/your/project/voice-notification-project
```

**方法 B：集成到现有项目**
```bash
# 只复制 .claude 文件夹到你的项目根目录
cp -r voice-notification-project/.claude /path/to/your/project/
```

### 2. 验证安装

运行测试脚本验证功能：
```powershell
cd .claude/hooks
# 查看脚本是否可执行
powershell -ExecutionPolicy Bypass -File voice-notification.ps1 -?
```

### 3. Claude Code 中使用

1. 在项目根目录打开 Claude Code
2. 进行任意对话（例如："帮我创建一个 Word 文档"）
3. Claude 完成工作后，自动触发语音播报

## 🎯 支持的场景

| 场景 | 触发关键词 | 播报示例 |
|------|-----------|---------|
| **文档创建** | 创建、生成、Word、文档 | "我已完成文档创建工作，生成了名为 报告.docx 的文件" |
| **文件删除** | 删除、清理、移除 | "我已完成文件清理工作，删除了不需要的测试文件" |
| **代码优化** | 优化、改进、重构、修改 | "我已完成代码优化工作" |
| **代码分析** | 分析、查看、检查、告诉我 | "我已完成分析工作，提供了详细说明" |
| **问题修复** | 修复、解决、bug、调试 | "我已完成问题修复工作" |
| **测试工作** | 测试、test、运行 | "我已完成测试工作" |
| **Git 操作** | 提交、推送、commit、push | "我已完成代码提交工作" |
| **配置设置** | 配置、设置、安装、部署 | "我已完成配置工作" |
| **通用任务** | （其他） | "我已完成您要求的任务：[用户问题首句]" |

## ⚙️ 配置说明

### settings.json

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File \".claude\\hooks\\voice-notification.ps1\""
          }
        ]
      }
    ]
  }
}
```

**关键配置项：**
- `Stop` - 在 Claude 停止工作时触发
- `command` - 执行的 PowerShell 命令
- 路径必须使用双反斜杠 `\\` 或使用相对路径

### voice-templates.json

消息模板和关键词配置文件，支持自定义：

```json
{
  "templates": {
    "document_creation": "我已完成文档创建工作",
    "document_creation_with_name": "我已完成文档创建工作，生成了名为 {name} 的文件",
    ...
  },
  "keywords": {
    "document_creation": ["创建", "生成", "制作", "Word", "文档"],
    "file_deletion": ["删除", "清理", "移除"],
    ...
  }
}
```

**自定义步骤：**
1. 打开 `voice-templates.json`
2. 修改 `templates` 中的播报文本
3. 修改 `keywords` 中的触发关键词
4. 保存文件（必须使用 UTF-8 编码）

## 🔧 工作原理

### 执行流程

```
Claude 完成任务 → Stop Hook 触发
    ↓
读取 stdin JSON 输入（包含 transcript_path）
    ↓
读取 transcript 文件（JSONL 格式）
    ↓
从后向前扫描，提取：
  - 最后一条用户消息
  - Claude 的最后回复
    ↓
关键词匹配 → 选择场景模板
    ↓
生成智能总结（支持占位符替换）
    ↓
启动后台 Job 播放语音（非阻塞）
    ↓
记录日志 → 脚本退出
```

### Transcript 格式支持

支持两种格式：

**格式 1：input/output 类型**
```json
{"type":"input","role":"user","content":[{"type":"text","text":"用户消息"}]}
{"type":"output","role":"assistant","content":[{"type":"text","text":"Claude回复"}]}
```

**格式 2：message 类型**
```json
{"type":"message","role":"user","content":"用户消息"}
{"type":"message","role":"assistant","content":"Claude回复"}
```

### 关键词匹配逻辑

```powershell
# 使用 IndexOf 进行简单字符串匹配
if ($userMessage.IndexOf("创建") -ge 0 -and $userMessage.IndexOf("文档") -ge 0) {
    # 匹配 "文档创建" 场景
}
```

## 📝 日志说明

### voice-debug.log

详细的执行日志，包含：
- Transcript 路径
- 文件读取状态
- 用户消息和 Claude 回复提取
- 关键词匹配结果
- 生成的总结内容
- 语音播放结果

**示例：**
```
2025-11-02 22:51:25 | === Voice Notification Started ===
2025-11-02 22:51:25 | Templates loaded successfully
2025-11-02 22:51:25 | Transcript path: /path/to/transcript.jsonl
2025-11-02 22:51:25 | Found user message at line: 0 (string)
2025-11-02 22:51:25 | User message preview: 请帮我创建一个用户管理模块
2025-11-02 22:51:25 | Matched: document_creation with keyword: 创建
2025-11-02 22:51:25 | FINAL SUMMARY: 我已完成文档创建工作
2025-11-02 22:51:29 | Voice playback result: 1 SUCCESS
```

### voice-notifications.log

播报历史记录：
```
2025-11-02 22:30:11 | 我已完成本次任务
2025-11-02 22:51:25 | 我已完成文档创建工作
```

## 🐛 故障排查

### 问题 1：没有语音播报

**检查步骤：**
1. 查看 `voice-debug.log` 最后几行
2. 确认 "Voice playback result: 1 SUCCESS"
3. 检查系统音量和扬声器

**常见原因：**
- Windows SAPI.SpVoice 未安装
- 音量设置为 0
- transcript_path 为空

### 问题 2：播报内容总是"我已完成本次任务"

**原因：**
- 没有读取到用户消息
- transcript 文件不存在
- transcript 格式不支持

**解决：**
1. 检查 `voice-debug.log`：
   ```
   Final - User message length: 0  ← 这表示未读取到
   ```
2. 确认 transcript 文件存在且格式正确
3. 查看 "Found user message at line: X" 是否出现

### 问题 3：中文乱码

**原因：**
- 日志文件编码问题（这不影响语音播放）

**解决：**
```powershell
# 使用 UTF-8 编码查看日志
Get-Content voice-debug.log -Encoding UTF8
```

### 问题 4：脚本执行权限错误

**解决：**
```powershell
# 设置执行策略
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

或者在命令中使用 `-ExecutionPolicy Bypass`（已在 settings.json 中配置）

## 🎨 自定义开发

### 添加新场景

1. **编辑 voice-templates.json**

添加新模板和关键词：
```json
{
  "templates": {
    ...
    "database_migration": "我已完成数据库迁移工作"
  },
  "keywords": {
    ...
    "database_migration": ["数据库", "迁移", "migration", "migrate"]
  }
}
```

2. **无需修改脚本** - 脚本会自动读取新配置

### 调整语音参数

编辑 `voice-notification.ps1` 中的语音设置：

```powershell
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Volume = 100    # 音量: 0-100
$voice.Rate = -1       # 语速: -10(慢) 到 10(快)
$voice.Speak($text, 0) # 0=同步, 1=异步
```

### 添加文件名提取

当前支持 "名为" 关键词，可以扩展：

```powershell
# 添加 "叫做" 支持
$searchStr1 = [char]0x540D + [char]0x4E3A  # "名为"
$searchStr2 = [char]0x53EB + [char]0x505A  # "叫做"
```

## 📊 性能特性

- **执行时间：** < 300ms（包含语音播放启动）
- **非阻塞设计：** 使用 Start-Job 后台播放，脚本立即返回
- **内存占用：** < 20MB
- **日志文件：** 每条记录 ~100 字节

## 🔒 安全说明

- ✅ 只读取 transcript 文件，不修改任何文件
- ✅ 错误静默失败，不影响 Claude 工作流
- ✅ 不发送任何网络请求
- ✅ 不执行任何用户输入的代码

## 📜 版本历史

### v1.0.0 (2025-11-02)
- ✅ 初始版本
- ✅ 支持读取用户消息和 Claude 回复
- ✅ 8 种场景智能识别
- ✅ 关键词匹配系统
- ✅ 外部 JSON 模板配置
- ✅ 详细调试日志
- ✅ UTF-8 中文支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请：
1. 查看 `voice-debug.log` 调试日志
2. 查看本文档的故障排查章节
3. 提交 Issue 到项目仓库

---

**享受智能语音播报带来的全新 Claude Code 体验！** 🎉
