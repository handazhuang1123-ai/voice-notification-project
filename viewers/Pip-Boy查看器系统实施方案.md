# Pip-Boy 查看器系统实施方案

> **项目**: PowerShell 语音通知项目 - Pip-Boy 风格日志浏览器
> **实施日期**: 2025-01-16
> **设计者**: 壮爸 + Claude
> **版本**: v1.0

---

## 📋 执行摘要

本文档记录了 Pip-Boy 查看器系统的最终确定架构和实施方案，用于后续开发任务的接续和参考。

**核心决策**：
1. ✅ 前端采用 **HTML/CSS + 主从布局方案A**（左右分栏）
2. ✅ 后端与前端**逻辑分离**，通过 JSON 数据交互
3. ✅ 样式封装为**独立的可复用主题包**（未来可独立版本管理）
4. ✅ 先实现**独立页面**，后期考虑集成导航
5. ✅ 脚本按**功能分组**组织，清晰易懂
6. ✅ RAG 向量记忆查看器目前**仅预留结构**

---

## 📁 最终目录结构

```
voice-notification-project/
│
├── viewers/                              # 【前端查看器系统总目录】
│   │
│   ├── pip-boy-theme/                   # 【Pip-Boy 样式主题包】
│   │   │                                 # 未来可独立发布为 NPM 包
│   │   ├── README.md                    # 主题使用说明
│   │   ├── package.json                 # 版本信息和元数据
│   │   ├── LICENSE                      # MIT 许可证
│   │   │
│   │   ├── css/                         # 样式文件（分层设计）
│   │   │   ├── pip-boy-base.css        # 基础样式（容器、布局）
│   │   │   ├── pip-boy-crt.css         # CRT 特效（扫描线、闪烁、荧光）
│   │   │   ├── pip-boy-components.css  # 通用组件（列表、面板、按钮）
│   │   │   └── pip-boy-colors.css      # 颜色主题（绿色为主）
│   │   │
│   │   ├── js/                          # JavaScript 工具脚本
│   │   │   ├── keyboard-navigation.js  # 键盘导航逻辑（↑↓Enter ESC）
│   │   │   └── data-loader.js          # 通用数据加载器
│   │   │
│   │   ├── fonts/                       # 字体文件
│   │   │   └── VT323.woff2             # VT323 终端字体
│   │   │
│   │   └── demo/                        # 演示示例
│   │       └── index.html              # 样式效果演示页
│   │
│   ├── log-viewer/                      # 【日志查看器】
│   │   ├── index.html                   # 主界面（双击打开）
│   │   ├── README.md                    # 使用说明
│   │   │
│   │   ├── js/                          # 日志专用脚本
│   │   │   ├── app.js                  # 应用初始化
│   │   │   ├── log-renderer.js         # 日志渲染逻辑
│   │   │   └── session-manager.js      # 会话管理
│   │   │
│   │   └── data/                        # 日志数据目录
│   │       ├── logs.json               # 导出的日志数据
│   │       └── .gitkeep                # 保持目录存在
│   │
│   └── rag-memory/                      # 【RAG 向量记忆查看器】（预留）
│       ├── index.html                   # （待实现）
│       ├── README.md                    # （待实现）
│       ├── js/
│       │   └── app.js                  # （待实现）
│       └── data/
│           └── .gitkeep
│
├── scripts/                              # 【PowerShell 脚本】
│   │
│   ├── viewers/                         # 查看器相关脚本
│   │   │
│   │   ├── log-viewers/                 # 日志查看器脚本
│   │   │   ├── Export-LogsData.ps1     # 导出日志到 JSON
│   │   │   └── Open-LogViewer.ps1      # 打开日志查看器
│   │   │
│   │   ├── rag-memory/                  # RAG 查看器脚本（预留）
│   │   │   ├── Export-RagData.ps1      # （待实现）
│   │   │   └── Open-RagViewer.ps1      # （待实现）
│   │   │
│   │   └── shared/                      # 共享工具函数
│   │       └── ConvertTo-ViewerJson.ps1 # 通用 JSON 转换函数
│   │
│   └── ... (其他项目脚本)
│
├── logs/                                 # 【原始日志文件】（已存在）
├── src/                                  # 【项目源代码】（已存在）
├── docs/                                 # 【项目文档】（已存在）
│   ├── Pip-Boy日志浏览器实现方案调研报告.md
│   ├── 软件项目可迁移性最佳实践研究报告.md
│   └── Pip-Boy查看器系统实施方案.md      # 【本文档】
└── README.md                             # 项目主 README
```

---

## 🎯 模块职责说明

### 1️⃣ `pip-boy-theme/` - 样式主题包

**职责**：
- 提供 Fallout Pip-Boy 风格的 CRT 复古界面样式
- 封装可复用的 CSS 样式和 JavaScript 工具
- 作为独立模块，未来可发布为 NPM 包

**核心文件**：
| 文件 | 用途 |
|------|------|
| `css/pip-boy-base.css` | 基础容器、布局、字体定义 |
| `css/pip-boy-crt.css` | CRT 特效（扫描线、闪烁、荧光） |
| `css/pip-boy-components.css` | 列表、面板、按钮等通用组件 |
| `css/pip-boy-colors.css` | 颜色主题（绿色荧光配色） |
| `js/keyboard-navigation.js` | 键盘导航工具（↑↓Enter） |
| `js/data-loader.js` | 通用 JSON 数据加载器 |

**设计原则**：
- ✅ 完全独立，不依赖任何外部库（纯 Vanilla JS）
- ✅ 模块化设计，可按需引用 CSS 文件
- ✅ 通用性优先，样式不包含业务逻辑

---

### 2️⃣ `viewers/log-viewer/` - 日志查看器

**职责**：
- 展示 PowerShell 语音通知日志
- 实现主从布局（左侧会话列表 + 右侧详情面板）
- 提供键盘导航交互

**数据流**：
```
原始日志 (logs/*.json)
    ↓
PowerShell 脚本读取
    ↓
Export-LogsData.ps1 转换
    ↓
生成 viewers/log-viewer/data/logs.json
    ↓
前端 JavaScript 加载
    ↓
渲染为 Pip-Boy 界面
```

**核心文件**：
| 文件 | 用途 |
|------|------|
| `index.html` | 主界面入口，引用主题包 CSS/JS |
| `js/app.js` | 应用初始化，协调各模块 |
| `js/log-renderer.js` | 日志数据渲染为 HTML |
| `js/session-manager.js` | 会话选择、状态管理 |
| `data/logs.json` | 日志数据文件（由脚本生成） |

---

### 3️⃣ `scripts/viewers/log-viewers/` - 后端脚本

**职责**：
- 从原始日志目录读取 JSON 日志文件
- 转换为前端所需的统一格式
- 提供一键打开查看器的便捷脚本

**核心文件**：
| 文件 | 用途 |
|------|------|
| `Export-LogsData.ps1` | 读取 `logs/*.json`，生成 `viewers/log-viewer/data/logs.json` |
| `Open-LogViewer.ps1` | 自动导出数据 + 在浏览器中打开 `index.html` |

---

### 4️⃣ `viewers/rag-memory/` - RAG 查看器（预留）

**状态**: 📦 仅创建目录结构，待 RAG 功能实现后开发

**未来用途**：
- 查看向量记忆数据库内容
- 展示知识图谱、相似度搜索结果
- 复用 `pip-boy-theme/` 样式

---

## 🔗 模块依赖关系图

```
┌─────────────────────────────────────────────────┐
│         pip-boy-theme (核心样式包)               │
│  ├── CSS (CRT 特效、颜色、组件)                  │
│  ├── JS (键盘导航、数据加载)                     │
│  └── 字体                                       │
└──────────────────┬──────────────────────────────┘
                   │ 被引用
    ┌──────────────┴──────────────┐
    ↓                              ↓
┌─────────────────┐    ┌──────────────────┐
│  log-viewer/    │    │  rag-memory/     │
│  (日志查看器)    │    │  (预留)          │
│  ├── index.html │    │  ├── index.html  │
│  └── app.js     │    │  └── app.js      │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         │ 加载数据              │ 加载数据
         ↓                      ↓
┌─────────────────┐    ┌──────────────────┐
│  data/logs.json │    │  data/rag.json   │
└────────┬────────┘    └────────┬─────────┘
         │ 由脚本生成            │ 待实现
         ↓
┌───────────────────────────┐
│ scripts/viewers/log-viewers/│
│ Export-LogsData.ps1       │
└───────────────────────────┘
```

---

## 📊 数据格式规范

### 日志数据格式 (`viewers/log-viewer/data/logs.json`)

```json
{
  "version": "1.0",
  "dataType": "logs",
  "generatedAt": "2025-01-16T14:30:00Z",
  "items": [
    {
      "sessionId": "20250116-143005-abc123",
      "timestamp": "2025-01-16T14:30:05",
      "message": "系统启动成功",
      "duration": 2.5,
      "status": "Success",
      "details": {
        "ollama_model": "qwen2.5:7b-instruct",
        "voice": "zh-CN-XiaoxiaoNeural",
        "full_log": "..."
      }
    }
  ]
}
```

**字段说明**：
- `version`: 数据格式版本（方便未来升级）
- `dataType`: 数据类型标识（`logs` / `rag-memory` / 其他）
- `generatedAt`: 数据生成时间戳
- `items[]`: 日志条目数组
  - `sessionId`: 会话唯一标识
  - `timestamp`: 日志时间戳
  - `message`: 简短消息
  - `duration`: 执行耗时（秒）
  - `status`: 状态（`Success` / `Warning` / `Error`）
  - `details`: 详细信息对象

---

## 🛠️ 实施步骤规划

### 阶段 1: pip-boy-theme 主题包开发 ⏳
**优先级**: 高
**预计工作量**: 6-8 小时

**任务清单**：
- [ ] 编写 `css/pip-boy-base.css`（布局、容器、字体）
- [ ] 编写 `css/pip-boy-crt.css`（扫描线、闪烁、荧光特效）
- [ ] 编写 `css/pip-boy-components.css`（列表、面板、按钮组件）
- [ ] 编写 `css/pip-boy-colors.css`（Pip-Boy 绿色主题）
- [ ] 编写 `js/keyboard-navigation.js`（键盘事件处理）
- [ ] 编写 `js/data-loader.js`（JSON 数据加载）
- [ ] 创建 `demo/index.html`（样式演示页）
- [ ] 编写 `README.md` 和 `package.json`

**参考资源**：
- `docs/Pip-Boy日志浏览器实现方案调研报告.md` 第 2 章
- CodePen 示例：https://codepen.io/32bitkid/pen/DrXOVg

---

### 阶段 2: 日志查看器前端开发 ⏳
**优先级**: 高
**预计工作量**: 4-6 小时

**任务清单**：
- [ ] 编写 `index.html`（引用主题包，定义主从布局）
- [ ] 编写 `js/app.js`（应用初始化，加载数据）
- [ ] 编写 `js/log-renderer.js`（渲染日志列表和详情）
- [ ] 编写 `js/session-manager.js`（会话选择、状态管理）
- [ ] 编写 `README.md`（使用说明）

**依赖**：需要先完成阶段 1（主题包）

---

### 阶段 3: PowerShell 后端脚本开发 ⏳
**优先级**: 高
**预计工作量**: 3-4 小时

**任务清单**：
- [ ] 编写 `scripts/viewers/log-viewers/Export-LogsData.ps1`
  - 读取 `logs/*.json` 文件
  - 转换为统一格式
  - 生成 `viewers/log-viewer/data/logs.json`
- [ ] 编写 `scripts/viewers/log-viewers/Open-LogViewer.ps1`
  - 调用 `Export-LogsData.ps1`
  - 在默认浏览器中打开 `index.html`
- [ ] 编写 `scripts/viewers/shared/ConvertTo-ViewerJson.ps1`
  - 通用 JSON 转换函数
- [ ] 添加 Comment-Based Help 文档

**依赖**：独立任务，可与阶段 2 并行

---

### 阶段 4: 测试和文档完善 ⏳
**优先级**: 中
**预计工作量**: 2-3 小时

**任务清单**：
- [ ] 端到端测试（从生成日志到查看器展示）
- [ ] 跨浏览器测试（Chrome、Edge、Firefox）
- [ ] 编写故障排查文档
- [ ] 录制演示视频或截图
- [ ] 更新项目主 README.md

---

### 阶段 5: RAG 查看器开发 📦
**优先级**: 低（预留）
**前置条件**: RAG 向量记忆系统实现完成

**任务清单**：
- [ ] 设计 RAG 数据格式规范
- [ ] 复制 `log-viewer/` 目录结构到 `rag-memory/`
- [ ] 修改业务逻辑（查询、相似度展示）
- [ ] 编写后端导出脚本
- [ ] 测试和文档

---

## 🎨 设计原则总结

### 1. 分离关注点（Separation of Concerns）
- ✅ **样式与业务分离**: `pip-boy-theme/` 不包含业务逻辑
- ✅ **前后端分离**: 通过 JSON 数据交互
- ✅ **模块化**: CSS 分层、JS 按功能拆分

### 2. 可复用性（Reusability）
- ✅ **主题包独立**: 可用于任何需要 Pip-Boy 风格的项目
- ✅ **脚本通用**: `shared/` 目录存放通用工具函数
- ✅ **数据格式统一**: `version` + `dataType` 字段便于扩展

### 3. 可维护性（Maintainability）
- ✅ **清晰命名**: 目录和文件名一目了然
- ✅ **文档齐全**: 每个模块都有 README
- ✅ **按功能分组**: 脚本按 `logs/`、`rag-memory/` 分组

### 4. 可扩展性（Extensibility）
- ✅ **预留结构**: `rag-memory/` 目录已创建
- ✅ **版本化**: `package.json` 和数据格式 `version` 字段
- ✅ **松耦合**: 各模块独立，易于新增功能

### 5. 小白友好（User-Friendly）
- ✅ **一键启动**: `Open-LogViewer.ps1` 自动化流程
- ✅ **双击打开**: `index.html` 可直接在浏览器打开
- ✅ **清晰文档**: README 提供快速上手指南

---

## 📚 参考文档

1. **Pip-Boy日志浏览器实现方案调研报告**
   `docs/Pip-Boy日志浏览器实现方案调研报告.md`
   - 技术选型依据
   - CRT 特效实现方法
   - 主从布局设计

2. **软件项目可迁移性最佳实践研究报告**
   `docs/软件项目可迁移性最佳实践研究报告.md`
   - 模块化设计原则
   - 依赖管理策略
   - 跨平台兼容性

3. **项目编码规范**
   `.claude/CLAUDE.md`
   - PowerShell 编码规范
   - 文件格式规则（UTF-8 BOM、CRLF）
   - Comment-Based Help 模板

---

## ✅ 验收标准

### 功能性验收
- [ ] 能够读取 `logs/` 目录下的所有 JSON 日志文件
- [ ] 能够在浏览器中正确展示 Pip-Boy 风格界面
- [ ] 支持键盘导航（↑↓ 选择会话，Enter 查看详情）
- [ ] CRT 特效正常显示（扫描线、闪烁、荧光）
- [ ] 左右分栏布局正确（30% / 70%）

### 质量验收
- [ ] 所有 PowerShell 脚本通过 PSScriptAnalyzer 检查
- [ ] 所有脚本包含完整的 Comment-Based Help
- [ ] 代码符合 `.editorconfig` 格式规范
- [ ] 所有模块都有 README 文档
- [ ] 跨浏览器测试通过（Chrome、Edge、Firefox）

### 可维护性验收
- [ ] 目录结构清晰，命名规范
- [ ] 样式主题包可独立运行（`demo/index.html`）
- [ ] 新增查看器只需复制目录结构（验证扩展性）
- [ ] 文档完整，新人可独立上手

---

## 🚀 快速启动指南（实施后）

### 开发者首次使用

```powershell
# 1. 克隆项目
git clone <repo-url>
cd voice-notification-project

# 2. 生成示例日志数据
.\scripts\Generate-SampleLogs.ps1

# 3. 打开日志查看器
.\scripts\viewers\log-viewers\Open-LogViewer.ps1
```

### 日常使用

```powershell
# 查看最新日志
.\scripts\viewers\log-viewers\Open-LogViewer.ps1

# 或直接双击
viewers\log-viewer\index.html
```

---

## 📝 变更记录

| 版本 | 日期 | 变更内容 | 备注 |
|------|------|----------|------|
| v1.0 | 2025-01-16 | 初始架构设计 | 创建目录结构和本文档 |

---

## 👤 联系人

**项目负责人**: 壮爸
**技术支持**: Claude (Anthropic)
**文档维护**: 本文档应在架构变更时及时更新

---

**文档结束** - 后续任务请参考"实施步骤规划"章节 🎯
