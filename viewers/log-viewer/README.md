# Pip-Boy 日志查看器

PowerShell 语音通知项目的日志浏览器 - 采用主从布局设计，支持键盘导航。

## 📋 功能特性

- ✅ **主从布局**：左侧会话列表（30%）+ 右侧详情面板（70%）
- ✅ **键盘导航**：支持方向键、Home、End、Enter、Esc 快捷键
- ✅ **自动加载**：从 `data/logs.json` 自动加载日志数据
- ✅ **会话管理**：选择、高亮、滚动定位
- ✅ **详情展示**：完整显示会话信息和 JSON 数据

## 🚀 快速使用

### 方式 1：一键打开（推荐）

```powershell
# 自动导出最新数据并打开查看器
.\scripts\viewers\log-viewers\Open-LogViewer.ps1
```

### 方式 2：手动打开

```powershell
# 1. 导出日志数据
.\scripts\viewers\log-viewers\Export-LogsData.ps1

# 2. 双击打开 HTML 文件
.\viewers\log-viewer\index.html
```

### 方式 3：仅使用现有数据

```powershell
# 跳过数据导出，直接打开
.\scripts\viewers\log-viewers\Open-LogViewer.ps1 -SkipExport
```

## ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `↑` / `↓` | 上下移动选择 |
| `Home` | 跳转到第一项 |
| `End` | 跳转到最后一项 |
| `Enter` | 确认选择（触发详情刷新） |
| `Esc` | 取消选择 |

## 📂 文件结构

```
log-viewer/
├── index.html              # 主页面（主从布局）
├── README.md               # 使用说明（本文件）
│
├── js/                     # JavaScript 脚本
│   ├── app.js              # 应用初始化
│   ├── log-renderer.js     # 日志渲染器
│   └── session-manager.js  # 会话管理和键盘导航
│
└── data/                   # 数据目录
    └── logs.json           # 日志数据（由脚本生成）
```

## 🔧 数据格式

日志数据文件 `data/logs.json` 格式：

```json
{
  "version": "1.0",
  "dataType": "logs",
  "generatedAt": "2025-01-17T05:17:46Z",
  "items": [
    {
      "sessionId": "20251106-224306",
      "timestamp": "2025-11-06T22:43:06.282Z",
      "message": "系统启动成功",
      "duration": 13.14,
      "status": "Success",
      "details": {
        "userMessage": "...",
        "claudeReply": "...",
        "ollamaModel": "qwen2.5:7b-instruct",
        "voice": "zh-CN-XiaoxiaoNeural"
      }
    }
  ]
}
```

## 🎨 界面说明

### 左侧：会话列表
- 显示所有日志会话
- 每项显示：会话 ID、时间戳、消息摘要
- 点击或使用键盘选择会话

### 右侧：详情面板
- **基本信息**：会话 ID、时间、消息、时长、状态
- **详细信息**：用户消息、Claude 回复、模型、语音设置
- **完整数据**：JSON 格式的原始数据

## 📊 状态指示

- **Success**（绿色）：成功执行
- **Warning**（橙色）：警告信息
- **Error**（红色）：错误信息

## 🔍 故障排查

### 问题 1：页面显示"正在加载日志数据..."不消失

**原因**：`data/logs.json` 文件不存在或无法读取

**解决**：
```powershell
# 重新导出日志数据
.\scripts\viewers\log-viewers\Export-LogsData.ps1 -Verbose
```

### 问题 2：显示"日志数据格式无效"

**原因**：JSON 文件格式错误

**解决**：
1. 检查 `data/logs.json` 是否是有效的 JSON
2. 确认文件包含 `items` 数组字段
3. 重新导出数据

### 问题 3：无法使用键盘导航

**原因**：页面焦点可能不在正确位置

**解决**：
1. 点击页面任意位置获取焦点
2. 刷新页面（F5）

## 📝 开发说明

### 技术栈
- **HTML5** + **CSS3**：页面结构和样式
- **Vanilla JavaScript**：无依赖，纯原生 JS
- **Fetch API**：异步加载 JSON 数据

### 架构设计
- **SessionManager**：管理会话数据和键盘导航
- **LogRenderer**：负责 UI 渲染
- **App**：应用初始化和事件绑定

### 扩展建议
- 添加搜索/过滤功能
- 支持按时间、状态排序
- 导出选中会话为文本
- 添加 Pip-Boy 主题样式（扫描线、荧光效果）

## 📚 相关文档

- [Pip-Boy查看器系统实施方案](../../docs/Pip-Boy查看器系统实施方案.md)
- [Pip-Boy日志浏览器实现方案调研报告](../../docs/Pip-Boy日志浏览器实现方案调研报告.md)

## 👤 维护者

**项目负责人**：壮爸
**创建日期**：2025-01-17
**版本**：v1.0
