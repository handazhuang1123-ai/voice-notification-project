# 项目文件结构说明

## 📁 完整目录树

```
voice-notification-project/
│
├── .claude/                                 # Claude Code 配置目录
│   ├── settings.json                        # Hook 配置文件
│   └── hooks/                               # Hooks 脚本目录
│       ├── voice-notification.ps1           # ⭐ 主脚本（核心功能）
│       ├── voice-templates.json             # ⭐ 消息模板配置
│       ├── test-input.json                  # 测试输入数据
│       ├── test-transcript.jsonl            # 测试 transcript 文件
│       ├── test-voice.ps1                   # 🧪 测试脚本
│       ├── voice-debug.log                  # 📝 调试日志（自动生成）
│       └── voice-notifications.log          # 📝 播报历史（自动生成）
│
├── README.md                                # 📖 项目说明文档
├── USAGE.md                                 # 📖 使用指南
├── CHANGELOG.md                             # 📖 更新日志
├── PROJECT-STRUCTURE.md                     # 📖 本文件
└── .gitignore                               # Git 忽略配置
```

## 📄 文件说明

### 核心文件（必需）

#### `.claude/settings.json`
- **作用：** Claude Code 的 Hook 配置
- **内容：** 定义 Stop 事件触发的命令
- **修改：** 如需更改脚本路径，修改此文件

#### `.claude/hooks/voice-notification.ps1`
- **作用：** 主功能脚本
- **大小：** ~250 行代码
- **功能：**
  - 读取 stdin 获取 transcript 路径
  - 解析 transcript 提取用户消息和 Claude 回复
  - 关键词匹配识别场景
  - 生成智能总结
  - 语音播报
  - 记录日志
- **修改：** 如需调整语音参数或逻辑，修改此文件

#### `.claude/hooks/voice-templates.json`
- **作用：** 消息模板和关键词配置
- **格式：** UTF-8 编码的 JSON
- **内容：**
  - `templates`: 9 种场景的播报文本模板
  - `keywords`: 每个场景的触发关键词列表
- **修改：** 自定义播报内容或添加新场景

### 测试文件（可选）

#### `.claude/hooks/test-voice.ps1`
- **作用：** 完整的测试脚本
- **功能：**
  - 检查必需文件是否存在
  - 验证 JSON 语法
  - 测试 Windows TTS
  - 运行主脚本
  - 检查日志输出
- **用法：**
  ```powershell
  cd .claude\hooks
  powershell -ExecutionPolicy Bypass -File test-voice.ps1
  ```

#### `.claude/hooks/test-input.json`
- **作用：** 模拟 Claude Code 传入的 JSON 数据
- **内容：** 包含 event 和 transcript_path

#### `.claude/hooks/test-transcript.jsonl`
- **作用：** 模拟真实的 transcript 文件
- **格式：** 每行一个 JSON 对象（JSONL）
- **内容：** 模拟用户消息、Claude 回复、工具调用

### 日志文件（自动生成）

#### `.claude/hooks/voice-debug.log`
- **作用：** 详细执行日志
- **内容：**
  - 每次执行的完整过程
  - Transcript 路径
  - 用户消息和 Claude 回复提取结果
  - 关键词匹配结果
  - 生成的总结
  - 语音播放结果
- **编码：** UTF-8 without BOM
- **大小：** 随使用增长，建议定期清理

#### `.claude/hooks/voice-notifications.log`
- **作用：** 播报历史记录
- **格式：** 每行一条记录（时间戳 | 播报内容）
- **用途：** 追踪历史播报，分析使用情况

### 文档文件

#### `README.md`
- **作用：** 项目主文档
- **内容：**
  - 项目概述和特性
  - 安装部署指南
  - 支持的场景列表
  - 配置说明
  - 工作原理
  - 日志说明
  - 故障排查
  - 自定义开发
- **大小：** ~10 KB

#### `USAGE.md`
- **作用：** 使用说明
- **内容：**
  - 快速上手步骤
  - 常见使用场景示例
  - 自定义配置教程
  - 日志查看命令
  - 高级用法

#### `CHANGELOG.md`
- **作用：** 版本历史
- **内容：**
  - 版本号和发布日期
  - 新增功能
  - 修复问题
  - 已知问题
  - 未来计划

#### `PROJECT-STRUCTURE.md`
- **作用：** 本文件，项目结构说明

### 配置文件

#### `.gitignore`
- **作用：** Git 版本控制忽略规则
- **内容：**
  - 忽略日志文件
  - 忽略系统文件
  - 忽略临时文件

## 🔄 文件依赖关系

```
settings.json
    ↓ (触发)
voice-notification.ps1
    ↓ (读取)
voice-templates.json
    ↓ (需要)
transcript 文件 (由 Claude Code 生成)
    ↓ (生成)
voice-debug.log
voice-notifications.log
```

## 📦 最小部署清单

如果只想部署核心功能，只需这些文件：

```
.claude/
├── settings.json
└── hooks/
    ├── voice-notification.ps1
    └── voice-templates.json
```

其他文件都是可选的（测试、文档、示例）。

## 🚀 部署方式

### 方式 1：完整部署（推荐）
```bash
# 复制整个项目
cp -r voice-notification-project /path/to/your/project/
```

### 方式 2：最小部署
```bash
# 只复制 .claude 目录
cp -r voice-notification-project/.claude /path/to/your/project/
```

### 方式 3：集成到现有项目
```bash
# 如果已有 .claude 目录，只复制 hooks
cp -r voice-notification-project/.claude/hooks /path/to/your/project/.claude/

# 手动合并 settings.json 中的 Stop hook 配置
```

## 🔧 自定义开发指南

### 修改播报内容
👉 编辑 `voice-templates.json`

### 添加新场景
1. 在 `voice-templates.json` 添加模板和关键词
2. 无需修改脚本代码

### 调整语音参数
👉 编辑 `voice-notification.ps1` 第 200-201 行

### 更改 Hook 触发事件
👉 编辑 `settings.json`，将 `Stop` 改为其他事件

## 📊 文件大小统计

| 文件 | 大小 | 类型 |
|------|------|------|
| voice-notification.ps1 | ~15 KB | 脚本 |
| voice-templates.json | ~1 KB | 配置 |
| settings.json | ~0.3 KB | 配置 |
| README.md | ~25 KB | 文档 |
| USAGE.md | ~5 KB | 文档 |
| CHANGELOG.md | ~5 KB | 文档 |
| test-voice.ps1 | ~4 KB | 测试 |
| **总计** | **~55 KB** | - |

日志文件大小取决于使用频率，建议定期清理。

## 🛠️ 维护建议

### 定期清理日志
```powershell
# 清空调试日志
"" | Out-File .claude\hooks\voice-debug.log

# 或者保留最近 100 行
Get-Content .claude\hooks\voice-debug.log -Tail 100 | Out-File temp.log
Move-Item temp.log .claude\hooks\voice-debug.log -Force
```

### 备份配置
```bash
cp .claude/hooks/voice-templates.json .claude/hooks/voice-templates.json.bak
```

### 版本控制
建议将以下文件纳入版本控制：
- `.claude/settings.json`
- `.claude/hooks/voice-notification.ps1`
- `.claude/hooks/voice-templates.json`
- 所有文档文件

忽略以下文件：
- `*.log`（日志文件）
- `*.bak`（备份文件）

---

需要更多信息，请参考其他文档文件或查看代码注释。
