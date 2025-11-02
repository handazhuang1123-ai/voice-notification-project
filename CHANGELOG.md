# 更新日志

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)规范。

## [1.0.0] - 2025-11-02

### ✨ 新增功能

- **智能消息提取**
  - 从 transcript 文件提取用户最后一条消息
  - 提取 Claude 的最后回复内容
  - 支持 input/output 和 message 两种 transcript 格式
  - 支持数组和字符串两种 content 格式

- **场景识别系统**
  - 文档创建场景（支持提取文件名）
  - 文件删除/清理场景
  - 代码优化/重构场景
  - 代码分析/查看场景
  - 问题修复/调试场景
  - 测试工作场景
  - Git 操作场景
  - 配置/设置场景
  - 通用任务场景（提取用户问题首句）

- **关键词匹配引擎**
  - 基于 IndexOf 的高效匹配
  - 支持中英文混合关键词
  - 外部 JSON 配置，无需修改代码

- **模板系统**
  - 9 个预设场景模板
  - 支持占位符替换（{name}, {task}）
  - UTF-8 中文完整支持

- **调试系统**
  - 详细的 voice-debug.log 日志
  - 记录每一步执行状态
  - 播报历史记录（voice-notifications.log）
  - 错误日志（voice-notification-errors.log）

- **语音播放**
  - 使用 Windows SAPI.SpVoice
  - 后台异步播放（Start-Job）
  - 可配置音量和语速
  - 5 秒超时保护

### 🔧 技术特性

- **编码处理**
  - 代码中完全避免中文字符
  - 使用 Unicode 字符码处理中文
  - 外部 JSON 存储所有中文文本
  - UTF-8 BOM 和 No-BOM 兼容

- **性能优化**
  - 从后向前扫描 transcript（高效）
  - 找到目标后立即停止搜索
  - 非阻塞语音播放
  - 执行时间 < 300ms

- **错误处理**
  - 所有操作包裹在 try-catch
  - 静默失败不影响 Claude 工作流
  - 详细错误日志记录

### 📦 项目结构

```
voice-notification-project/
├── .claude/
│   ├── settings.json
│   └── hooks/
│       ├── voice-notification.ps1       # 主脚本（250行）
│       └── voice-templates.json         # 配置文件
├── README.md                            # 项目说明
├── USAGE.md                             # 使用指南
└── CHANGELOG.md                         # 本文件
```

### 🐛 已知问题

- PowerShell 控制台可能显示中文乱码（不影响语音播放）
- 仅支持 Windows 平台（依赖 SAPI.SpVoice）
- 语音播放依赖系统 TTS 引擎质量

### 📝 文档

- 完整的 README.md（80+ KB）
- 详细的 USAGE.md 使用指南
- 内联代码注释

---

## 未来计划

### [1.1.0] - 计划中

**新功能：**
- [ ] 支持 AI 智能总结（调用 Ollama/OpenAI API）
- [ ] 多语言支持（英文模板）
- [ ] 桌面通知集成
- [ ] 可视化配置工具

**优化：**
- [ ] 更多场景识别（Docker、数据库、部署等）
- [ ] 提取更多上下文信息（文件数量、操作类型）
- [ ] 语音缓存机制
- [ ] 性能监控和统计

**文档：**
- [ ] 视频教程
- [ ] 常见问题 FAQ
- [ ] 最佳实践指南

### [2.0.0] - 长期规划

- [ ] 跨平台支持（macOS, Linux）
- [ ] Web 界面配置
- [ ] 播报历史可视化面板
- [ ] 自定义语音包
- [ ] 多用户配置支持

---

## 贡献者

- **壮爸** - 项目发起和需求设计
- **Claude (Sonnet 4.5)** - 代码实现和文档编写

## 反馈

如有建议或发现问题，欢迎：
- 提交 Issue
- 发起 Pull Request
- 联系维护者

---

感谢使用 Claude Code 语音通知 Hook！ 🎉
