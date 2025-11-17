# Pip-Boy 风格日志浏览器实现方案调研报告

**项目**: PowerShell 语音通知日志浏览器
**调研目标**: 实现 Fallout Pip-Boy 复古 CRT 风格界面
**调研人**: 壮爸
**日期**: 2025-01-16

---

## 一、执行摘要

本调研系统评估了为 PowerShell 日志浏览器创建 Pip-Boy 风格界面的两种主要技术路线：

1. **HTML/CSS 方案**：使用复古 CRT 绿色荧光效果
2. **Terminal.Gui 方案**：使用 PowerShell TUI（文本用户界面）

**核心发现**：
- HTML/CSS 方案可实现完整的 Pip-Boy 视觉效果（扫描线、荧光、CRT 闪烁）
- Terminal.Gui 提供原生终端体验，但视觉效果受限
- Out-ConsoleGridView 为最轻量级 TUI 解决方案
- 推荐采用**混合方案**：HTML 作为主界面，PowerShell 命令行作为备选

---

## 二、Pip-Boy 风格 UI 实现（HTML/CSS）

### 2.1 核心技术要素

#### 🎨 **绿色荧光效果（Green Phosphor Glow）**

**基础实现**：
```css
.terminal-text {
    color: #00ff00;
    font-family: "VT323", "Courier New", monospace;
    font-size: 18px;
    text-shadow: 0 0 10px #00ff00;
}
```

**高级多层发光**：
```css
.crt-glow {
    font-size: 30px;
    color: #f0fff8; /* 接近白色 */
    text-shadow:
        0 0 3px #80ffc0,   /* 内层淡绿 */
        0 0 10px #00ff66,  /* 中层亮绿 */
        0 0 20px #00ff66,  /* 外层扩散 */
        0 0 30px #00ff66;  /* 最外层光晕 */
}
```

**Pip-Boy 标准颜色配置**：
```css
:root {
    --terminal-green: #4af626;  /* Pip-Boy 主绿色 */
    --terminal-bg: #0a0a0a;     /* 接近全黑背景 */
    --phosphor-color: #33ff33;  /* P1 荧光绿 */
}
```

**来源**：
- [CSS-Tricks: Old Timey Terminal Styling](https://css-tricks.com/old-timey-terminal-styling/)
- [GitHub: HairyDuck/terminal](https://github.com/HairyDuck/terminal)

---

#### 📺 **扫描线效果（Scanlines）**

**静态扫描线**（使用线性渐变）：
```css
.scanlines::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0) 50%,
        rgba(0, 0, 0, 0.3) 50%
    );
    background-size: 100% 4px; /* 每 4px 一条线 */
    pointer-events: none;
    z-index: 2;
}
```

**动态扫描线动画**：
```css
@keyframes scan {
    0% { background-position: 0 0; }
    100% { background-position: 0 100%; }
}

.scanlines::before {
    animation: scan 8s linear infinite;
}
```

**来源**：
- [DEV Community: Retro CRT Terminal Screen](https://dev.to/ekeijl/retro-crt-terminal-screen-in-css-js-4afh)
- [Medium: Using CSS Animations To Mimic CRT Monitor](https://medium.com/@dovid11564/using-css-animations-to-mimic-the-look-of-a-crt-monitor-3919de3318e2)

---

#### ⚡ **CRT 闪烁效果（Flicker）**

```css
@keyframes flicker {
    0% { opacity: 0.97; }
    25% { opacity: 1; }
    50% { opacity: 0.95; }
    75% { opacity: 1; }
    100% { opacity: 0.97; }
}

.crt-screen {
    animation: flicker 0.15s infinite;
}
```

**来源**：[Alec Lownes: Using CSS to create a CRT](https://aleclownes.com/2017/02/01/crt-display.html)

---

#### 🖥️ **完整 CRT 容器模板**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Pip-Boy 日志查看器</title>
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
    <style>
        :root {
            --terminal-green: #4af626;
            --terminal-bg: #0a0a0a;
        }

        body {
            margin: 0;
            padding: 20px;
            background: #000;
            font-family: 'VT323', monospace;
        }

        .crt-container {
            position: relative;
            width: 100%;
            height: 100vh;
            background: var(--terminal-bg);
            overflow: hidden;
            border: 10px solid #333;
            box-shadow: inset 0 0 50px rgba(0, 255, 0, 0.1);
        }

        .scanlines {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }

        .scanlines::before {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                transparent 50%,
                rgba(0, 0, 0, 0.3) 50%
            );
            background-size: 100% 4px;
            animation: scan 8s linear infinite;
        }

        .terminal-content {
            padding: 20px;
            color: var(--terminal-green);
            text-shadow: 0 0 10px var(--terminal-green);
            font-size: 18px;
            animation: flicker 0.15s infinite;
        }

        @keyframes scan {
            from { background-position: 0 0; }
            to { background-position: 0 100%; }
        }

        @keyframes flicker {
            0%, 100% { opacity: 0.97; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="crt-container">
        <div class="scanlines"></div>
        <div class="terminal-content">
            <h1>ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</h1>
            <p>COPYRIGHT 2075-2077 ROBCO INDUSTRIES</p>
            <p>-Server 1-</p>
            <div id="log-viewer">
                <!-- 日志内容将在此处动态加载 -->
            </div>
        </div>
    </div>
</body>
</html>
```

---

### 2.2 优秀项目参考

| 项目 | 描述 | 链接 | 技术亮点 |
|------|------|------|----------|
| **HairyDuck/terminal** | 复古 CRT 终端模板 | [GitHub](https://github.com/HairyDuck/terminal) | 完整的扫描线、荧光和启动动画 |
| **Fallout Terminal (CodePen)** | Fallout 3 终端克隆 | [CodePen](https://codepen.io/32bitkid/pen/DrXOVg) | 原汁原味的 Fallout 终端效果 |
| **CRT Terminal Portfolio** | CRT 风格作品集网站 | [GitHub](https://github.com/atmozki/CRT-terminal-portfolio) | 交互式终端命令系统 |
| **Retro CRT Startpage** | HTML5 CRT 起始页 | [GitHub](https://github.com/scar45/retro-crt-startpage) | 高度可定制的配置系统 |

**CodePen 演示集合**：
- [Terminal with Scan Lines](https://codepen.io/Sly775/pen/VVBKXY)
- [Fallout Terminal Inspired](https://codepen.io/macktropolis/pen/vNMRpK)
- [Fallout 4 Terminal](https://codepen.io/wbarahona/pen/KMYybE)

---

### 2.3 实现难度评估

| 功能 | 难度 | 工作量 | 备注 |
|------|------|--------|------|
| 基础绿色终端 | ⭐ | 1 小时 | 仅需 CSS 文本样式 |
| 扫描线效果 | ⭐⭐ | 2 小时 | 线性渐变 + 动画 |
| CRT 闪烁 | ⭐ | 30 分钟 | 简单 keyframes 动画 |
| 打字机效果 | ⭐⭐ | 3 小时 | JavaScript 逐字符渲染 |
| 日志数据加载 | ⭐⭐⭐ | 4 小时 | PowerShell 数据转 JSON |
| 键盘导航 | ⭐⭐⭐ | 5 小时 | JavaScript 事件处理 |
| 会话列表 + 详情视图 | ⭐⭐⭐⭐ | 8 小时 | 主从布局 + 状态管理 |

**总工作量估算**：约 **20-25 小时**（全功能实现）

---

## 三、PowerShell Terminal UI 方案

### 3.1 技术选项对比

| 方案 | 成熟度 | 安装复杂度 | 视觉效果 | 跨平台 |
|------|--------|------------|----------|--------|
| **Out-ConsoleGridView** | ✅ 官方支持 | ⭐ 简单 | ⭐⭐ 基础 | ✅ Win/Linux/Mac |
| **Terminal.Gui** | ✅ 成熟稳定 | ⭐⭐ 中等 | ⭐⭐⭐ 丰富 | ✅ Win/Linux/Mac |
| **WPF (Out-GridView)** | ✅ 官方 | ⭐ 内置 | ⭐⭐⭐⭐ GUI | ❌ 仅 Windows |

---

### 3.2 Out-ConsoleGridView（推荐轻量级方案）

#### 📦 **安装**
```powershell
Install-Module Microsoft.PowerShell.ConsoleGuiTools -Scope CurrentUser
```

#### 📝 **基础用法**
```powershell
# 查看进程
Get-Process | Out-ConsoleGridView

# 选择单个项目
$selected = Get-Process | Out-ConsoleGridView -OutputMode Single

# 多选模式
$multiple = Get-ChildItem | Out-ConsoleGridView -OutputMode Multiple

# 预填充过滤器
Get-Process | Out-ConsoleGridView -Filter "note"
```

#### ⌨️ **键盘导航**
- **方向键**：上下左右移动
- **空格键**：标记/取消标记项目
- **Enter**：确认选择并返回
- **Tab**：切换焦点到过滤框
- **Ctrl+C**：取消并退出

#### 💡 **日志浏览器示例**
```powershell
function Show-LogViewer {
    <#
    .SYNOPSIS
        Display Ollama notification logs in a console grid view
        在控制台网格视图中显示 Ollama 通知日志
    #>
    [CmdletBinding()]
    param()

    $LogPath = "H:\HZH\Little-Projects\voice-notification-project\logs"

    # 获取所有日志会话
    $Sessions = Get-ChildItem -Path $LogPath -Filter "*.json" |
        ForEach-Object {
            $Content = Get-Content $_.FullName | ConvertFrom-Json
            [PSCustomObject]@{
                SessionID = $Content.SessionID
                Timestamp = $Content.Timestamp
                Message = $Content.Message
                Duration = $Content.Duration
                File = $_.Name
            }
        } |
        Sort-Object Timestamp -Descending

    # 显示选择器
    $Selected = $Sessions | Out-ConsoleGridView -Title "Ollama 日志会话" -OutputMode Single

    if ($Selected) {
        # 显示详细信息
        $LogFile = Join-Path $LogPath $Selected.File
        $Details = Get-Content $LogFile | ConvertFrom-Json

        Write-Host "`n=== 会话详情 ===" -ForegroundColor Green
        $Details | Format-List
    }
}
```

**来源**：
- [PowerShell Blog: Introducing ConsoleGuiTools](https://devblogs.microsoft.com/powershell/introducing-consoleguitools-preview/)
- [GitHub: PowerShell/ConsoleGuiTools](https://github.com/PowerShell/ConsoleGuiTools)

---

### 3.3 Terminal.Gui（高级 TUI 方案）

#### 📦 **安装与初始化**
```powershell
Install-Module Microsoft.PowerShell.ConsoleGuiTools
$module = (Get-Module Microsoft.PowerShell.ConsoleGuiTools -List).ModuleBase
Add-Type -Path (Join-Path $module Terminal.Gui.dll)
[Terminal.Gui.Application]::Init()
```

#### 📐 **主从布局示例**
```powershell
# 创建主窗口
$Window = [Terminal.Gui.Window]::new()
$Window.Title = "Pip-Boy 日志查看器"

# 左侧会话列表（30% 宽度）
$SessionList = [Terminal.Gui.FrameView]::new()
$SessionList.Title = "会话列表"
$SessionList.Width = [Terminal.Gui.Dim]::Percent(30)
$SessionList.Height = [Terminal.Gui.Dim]::Fill()

$ListView = [Terminal.Gui.ListView]::new()
$ListView.SetSource(@("Session 1", "Session 2", "Session 3"))
$ListView.Width = [Terminal.Gui.Dim]::Fill()
$ListView.Height = [Terminal.Gui.Dim]::Fill()
$SessionList.Add($ListView)

# 右侧详情面板（70% 宽度）
$DetailPanel = [Terminal.Gui.FrameView]::new()
$DetailPanel.Title = "详细信息"
$DetailPanel.X = [Terminal.Gui.Pos]::Right($SessionList)
$DetailPanel.Width = [Terminal.Gui.Dim]::Fill()
$DetailPanel.Height = [Terminal.Gui.Dim]::Fill()

$TextView = [Terminal.Gui.TextView]::new()
$TextView.Text = "选择左侧会话查看详情..."
$TextView.Width = [Terminal.Gui.Dim]::Fill()
$TextView.Height = [Terminal.Gui.Dim]::Fill()
$DetailPanel.Add($TextView)

# 选择事件处理
$ListView.add_SelectedItemChanged({
    $TextView.Text = "会话详情: $($ListView.SelectedItem)"
})

# 添加到窗口并运行
$Window.Add($SessionList)
$Window.Add($DetailPanel)
[Terminal.Gui.Application]::Top.Add($Window)
[Terminal.Gui.Application]::Run()
```

#### 📊 **TableView 数据展示**
```powershell
# 创建 DataTable
$Table = New-Object System.Data.DataTable
$Table.Columns.Add("SessionID", [string])
$Table.Columns.Add("Timestamp", [datetime])
$Table.Columns.Add("Message", [string])

# 添加数据行
$Row = $Table.NewRow()
$Row["SessionID"] = "12345"
$Row["Timestamp"] = Get-Date
$Row["Message"] = "系统启动完成"
$Table.Rows.Add($Row)

# 绑定到 TableView
$TableView = [Terminal.Gui.TableView]::new()
$TableView.Table = $Table
$TableView.Width = [Terminal.Gui.Dim]::Fill()
$TableView.Height = [Terminal.Gui.Dim]::Fill()
```

**布局管理技巧**：
- **Dim.Percent(n)**：百分比宽度/高度
- **Dim.Fill()**：填充剩余空间
- **Pos.Right(control)**：相对定位
- **Pos.Bottom(control)**：垂直堆叠

**来源**：
- [IronmanSoftware: Ultimate Guide to TUI in PowerShell](https://blog.ironmansoftware.com/tui-powershell/)
- [GitHub: Terminal.Gui Documentation](https://gui-cs.github.io/Terminal.Gui/)

---

### 3.4 实现难度评估

| 方案 | 开发难度 | 工作量 | 美观度 | 维护成本 |
|------|----------|--------|--------|----------|
| **Out-ConsoleGridView** | ⭐ | 2 小时 | ⭐⭐ | ⭐ 低 |
| **Terminal.Gui 基础** | ⭐⭐⭐ | 8 小时 | ⭐⭐⭐ | ⭐⭐ 中 |
| **Terminal.Gui 高级** | ⭐⭐⭐⭐ | 16 小时 | ⭐⭐⭐⭐ | ⭐⭐⭐ 高 |

---

## 四、日志浏览器设计最佳实践

### 4.1 参考项目：lnav（Log File Navigator）

**项目地址**：[GitHub: tstack/lnav](https://github.com/tstack/lnav)

#### 🎯 **核心功能**
- **自动格式检测**：自动识别日志格式（JSON、Apache、Syslog 等）
- **时间合并**：多文件按时间戳排序
- **语义高亮**：错误红色、警告黄色
- **SQL 查询**：内置 SQLite 引擎分析日志
- **直方图视图**：时间分布可视化

#### ⌨️ **键盘导航设计**
| 快捷键 | 功能 | 设计理念 |
|--------|------|----------|
| `j/k` | 上下移动 | Vim 风格，单手操作 |
| `e/E` | 下一个/上一个错误 | 快速定位问题 |
| `w/W` | 下一个/上一个警告 | 分类浏览 |
| `/` | 正则搜索 | 通用搜索模式 |
| `i` | 直方图视图 | 切换可视化 |
| `;` | SQL 查询 | 高级分析 |
| `?` | 帮助文档 | 快速参考 |

**设计亮点**：
1. **上下文感知**：根据当前视图激活不同快捷键
2. **渐进式学习**：基础导航简单（方向键），高级功能可选（SQL）
3. **视觉反馈**：底部状态栏实时显示快捷键提示

---

### 4.2 主从布局（Master-Detail）设计

#### 🎨 **布局方案 A：左右分栏**
```
┌─────────────────────────────────────────────────┐
│ ROBCO UNIFIED OPERATING SYSTEM (v7.2.1)         │
├──────────────┬──────────────────────────────────┤
│ 会话列表     │ 详细信息                         │
│ (30%)        │ (70%)                            │
│              │                                  │
│ > Session 1  │ SessionID: abc123                │
│   Session 2  │ Timestamp: 2025-01-16 14:30:05   │
│   Session 3  │ Message: 系统启动成功            │
│   Session 4  │ Duration: 2.5s                   │
│              │                                  │
│              │ --- 完整日志 ---                 │
│              │ [2025-01-16 14:30:03] INFO: ...  │
│              │ [2025-01-16 14:30:04] DEBUG: ... │
├──────────────┴──────────────────────────────────┤
│ [ENTER]选择 [↑↓]导航 [Q]退出 [F1]帮助          │
└─────────────────────────────────────────────────┘
```

#### 🎨 **布局方案 B：上下分栏**
```
┌─────────────────────────────────────────────────┐
│ ROBCO UNIFIED OPERATING SYSTEM (v7.2.1)         │
├─────────────────────────────────────────────────┤
│ 会话列表 (40%)                                  │
│ ID        时间              消息          状态  │
│ > abc123  2025-01-16 14:30  启动成功      ✓     │
│   def456  2025-01-16 14:25  警告：延迟    ⚠     │
│   ghi789  2025-01-16 14:20  错误：超时    ✗     │
├─────────────────────────────────────────────────┤
│ 详细信息 (60%)                                  │
│ SessionID: abc123                               │
│ Timestamp: 2025-01-16 14:30:05                  │
│ Message: 系统启动成功，所有服务正常             │
│ Duration: 2.5s                                  │
│ Status: Success                                 │
│                                                 │
│ --- 完整日志 ---                                │
│ [14:30:03] INFO: Initializing...                │
│ [14:30:04] DEBUG: Loading config...             │
│ [14:30:05] INFO: Startup complete               │
├─────────────────────────────────────────────────┤
│ [ENTER]选择 [↑↓]导航 [F]过滤 [Q]退出           │
└─────────────────────────────────────────────────┘
```

**推荐**：左右分栏（方案 A）
- **优势**：横向空间利用率高，适合宽屏显示
- **劣势**：需要更宽的终端窗口（建议最小 120 列）

---

### 4.3 交互设计模式

#### 📋 **状态管理**
```javascript
const AppState = {
    currentView: 'sessions',  // sessions | detail | filter
    selectedSession: null,
    filterText: '',
    sortBy: 'timestamp',
    sortOrder: 'desc'
};
```

#### ⌨️ **键盘映射**
```javascript
const KeyMappings = {
    // 导航
    'ArrowUp': () => moveCursor(-1),
    'ArrowDown': () => moveCursor(1),
    'Home': () => moveCursorToStart(),
    'End': () => moveCursorToEnd(),

    // 操作
    'Enter': () => selectSession(),
    'Escape': () => goBack(),
    'f': () => showFilter(),

    // 排序
    's': () => toggleSort(),

    // 退出
    'q': () => quit(),
    'F1': () => showHelp()
};
```

---

## 五、技术栈推荐与优劣对比

### 5.1 方案对比矩阵

| 维度 | HTML/CSS | Terminal.Gui | Out-ConsoleGridView |
|------|----------|--------------|---------------------|
| **视觉效果** | ⭐⭐⭐⭐⭐ 完美 Pip-Boy 风格 | ⭐⭐⭐ 基础 TUI | ⭐⭐ 简洁表格 |
| **开发难度** | ⭐⭐⭐ 中等（需 HTML/CSS/JS） | ⭐⭐⭐⭐ 高（学习曲线陡） | ⭐ 极简（一行代码） |
| **性能** | ⭐⭐⭐⭐ 浏览器渲染高效 | ⭐⭐⭐⭐⭐ 原生终端性能 | ⭐⭐⭐⭐ 轻量快速 |
| **可移植性** | ⭐⭐⭐⭐⭐ 任何浏览器 | ⭐⭐⭐⭐ Win/Linux/Mac | ⭐⭐⭐⭐ Win/Linux/Mac |
| **维护成本** | ⭐⭐⭐ 需维护前端代码 | ⭐⭐⭐⭐ 需维护 .NET 集成 | ⭐ 几乎无维护 |
| **用户体验** | ⭐⭐⭐⭐⭐ 沉浸式 Pip-Boy | ⭐⭐⭐⭐ 专业 TUI | ⭐⭐⭐ 实用但普通 |

---

### 5.2 推荐实施方案

#### 🥇 **方案 1：HTML/CSS 主界面（推荐用于展示）**

**适用场景**：
- 需要完整 Pip-Boy 视觉体验
- 日志查看频率较低（非实时监控）
- 有时间打磨界面细节

**实施步骤**：
1. **第 1 周**：搭建 HTML 基础框架 + CRT 效果
2. **第 2 周**：实现 PowerShell 数据导出为 JSON
3. **第 3 周**：JavaScript 动态加载日志数据
4. **第 4 周**：完善交互（键盘导航、过滤、排序）

**工作量**：约 **30-40 小时**

---

#### 🥈 **方案 2：Terminal.Gui（推荐用于生产）**

**适用场景**：
- 需要原生终端体验
- 频繁使用日志查看工具
- 希望完全在 PowerShell 生态内工作

**实施步骤**：
1. **第 1 周**：学习 Terminal.Gui API，搭建基础窗口
2. **第 2 周**：实现主从布局（ListView + TextView）
3. **第 3 周**：添加数据绑定和事件处理
4. **第 4 周**：优化性能和键盘导航

**工作量**：约 **25-35 小时**

---

#### 🥉 **方案 3：Out-ConsoleGridView（MVP 快速方案）**

**适用场景**：
- 快速验证需求
- 作为 Terminal.Gui 的备选方案
- 轻量级使用场景

**实施步骤**：
1. **1 小时**：实现基础日志列表查看
2. **2 小时**：添加详情查看逻辑
3. **1 小时**：编写帮助文档

**工作量**：约 **4 小时**

---

### 5.3 混合方案（最佳实践）

```powershell
function Show-OllamaLogs {
    <#
    .SYNOPSIS
        Show Ollama notification logs with multiple view options
        显示 Ollama 通知日志（多种视图选项）

    .PARAMETER ViewMode
        Display mode: Html, Tui, Grid
        显示模式：Html（网页）、Tui（终端界面）、Grid（网格）
    #>
    [CmdletBinding()]
    param(
        [ValidateSet('Html', 'Tui', 'Grid')]
        [string]$ViewMode = 'Grid'
    )

    switch ($ViewMode) {
        'Html' {
            # 生成 HTML 并在浏览器打开
            $HtmlPath = Export-LogsToHtml
            Start-Process $HtmlPath
        }
        'Tui' {
            # 使用 Terminal.Gui
            Show-TerminalGuiViewer
        }
        'Grid' {
            # 使用 Out-ConsoleGridView
            Get-LogSessions | Out-ConsoleGridView -OutputMode Single | Show-LogDetails
        }
    }
}
```

---

## 六、具体实现代码示例

### 6.1 HTML 日志导出器

```powershell
function Export-LogsToHtml {
    <#
    .SYNOPSIS
        Export Ollama logs to Pip-Boy style HTML viewer
        导出日志为 Pip-Boy 风格 HTML 查看器
    #>
    [CmdletBinding()]
    param(
        [string]$OutputPath = "$PSScriptRoot\logs\viewer.html"
    )

    $LogPath = "$PSScriptRoot\logs"

    # 读取所有日志
    $Sessions = Get-ChildItem -Path $LogPath -Filter "*.json" |
        ForEach-Object {
            Get-Content $_.FullName | ConvertFrom-Json
        } |
        Sort-Object Timestamp -Descending

    # 转换为 JSON（嵌入 HTML）
    $LogsJson = $Sessions | ConvertTo-Json -Depth 10

    # HTML 模板
    $HtmlTemplate = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROBCO INDUSTRIES - Pip-Boy Log Viewer</title>
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
    <style>
        :root {
            --terminal-green: #4af626;
            --terminal-bg: #0a0a0a;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'VT323', monospace;
            background: #000;
            color: var(--terminal-green);
            overflow: hidden;
        }

        .crt-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            background: var(--terminal-bg);
            padding: 20px;
        }

        /* 扫描线 */
        .scanlines {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        }

        .scanlines::before {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                transparent 50%,
                rgba(0, 0, 0, 0.3) 50%
            );
            background-size: 100% 4px;
            animation: scan 8s linear infinite;
        }

        /* CRT 闪烁 */
        .crt-flicker {
            animation: flicker 0.15s infinite;
        }

        @keyframes scan {
            from { background-position: 0 0; }
            to { background-position: 0 100%; }
        }

        @keyframes flicker {
            0%, 100% { opacity: 0.97; }
            50% { opacity: 1; }
        }

        /* 布局 */
        .header {
            text-align: center;
            margin-bottom: 20px;
            text-shadow: 0 0 10px var(--terminal-green);
        }

        .main-layout {
            display: flex;
            gap: 20px;
            height: calc(100vh - 150px);
        }

        .session-list {
            width: 30%;
            border: 2px solid var(--terminal-green);
            padding: 10px;
            overflow-y: auto;
            box-shadow: inset 0 0 20px rgba(74, 246, 38, 0.3);
        }

        .session-item {
            padding: 10px;
            cursor: pointer;
            border-bottom: 1px solid #1a5a1a;
            transition: background 0.3s;
        }

        .session-item:hover,
        .session-item.active {
            background: rgba(74, 246, 38, 0.2);
        }

        .detail-panel {
            width: 70%;
            border: 2px solid var(--terminal-green);
            padding: 20px;
            overflow-y: auto;
            box-shadow: inset 0 0 20px rgba(74, 246, 38, 0.3);
        }

        .detail-panel h3 {
            margin-bottom: 10px;
            text-decoration: underline;
        }

        .detail-item {
            margin: 5px 0;
            font-size: 18px;
        }

        .footer {
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            font-size: 16px;
            text-shadow: 0 0 5px var(--terminal-green);
        }

        /* 文本发光 */
        .glow {
            text-shadow:
                0 0 3px #80ffc0,
                0 0 10px #00ff66,
                0 0 20px #00ff66;
        }
    </style>
</head>
<body>
    <div class="crt-container crt-flicker">
        <div class="scanlines"></div>

        <div class="header">
            <h1 class="glow">ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</h1>
            <p>COPYRIGHT 2075-2077 ROBCO INDUSTRIES</p>
            <p>-SERVER 1-</p>
        </div>

        <div class="main-layout">
            <div class="session-list" id="sessionList">
                <h3 class="glow">会话列表</h3>
                <!-- 动态填充 -->
            </div>

            <div class="detail-panel" id="detailPanel">
                <h3 class="glow">详细信息</h3>
                <p>请从左侧选择会话...</p>
            </div>
        </div>

        <div class="footer">
            <p>[↑↓] 导航 | [ENTER] 选择 | [ESC] 退出</p>
        </div>
    </div>

    <script>
        const logs = $LogsJson;
        let selectedIndex = 0;

        // 渲染会话列表
        function renderSessions() {
            const listEl = document.getElementById('sessionList');
            const html = logs.map((log, idx) => `
                <div class="session-item" data-index="\${idx}" onclick="selectSession(\${idx})">
                    <strong>[\${log.SessionID}]</strong><br>
                    \${log.Timestamp}<br>
                    <em>\${log.Message}</em>
                </div>
            `).join('');

            listEl.innerHTML = '<h3 class="glow">会话列表</h3>' + html;
        }

        // 显示详情
        function selectSession(index) {
            selectedIndex = index;
            const log = logs[index];

            // 更新高亮
            document.querySelectorAll('.session-item').forEach((el, idx) => {
                el.classList.toggle('active', idx === index);
            });

            // 显示详情
            const detailEl = document.getElementById('detailPanel');
            detailEl.innerHTML = `
                <h3 class="glow">会话详情</h3>
                <div class="detail-item"><strong>SessionID:</strong> \${log.SessionID}</div>
                <div class="detail-item"><strong>Timestamp:</strong> \${log.Timestamp}</div>
                <div class="detail-item"><strong>Message:</strong> \${log.Message}</div>
                <div class="detail-item"><strong>Duration:</strong> \${log.Duration}s</div>
                <div class="detail-item"><strong>Status:</strong> \${log.Status || 'Success'}</div>
                <hr style="margin: 20px 0; border-color: var(--terminal-green);">
                <h4 class="glow">完整日志</h4>
                <pre>\${JSON.stringify(log, null, 2)}</pre>
            `;
        }

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    selectSession(selectedIndex);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(logs.length - 1, selectedIndex + 1);
                    selectSession(selectedIndex);
                    break;
                case 'Escape':
                    window.close();
                    break;
            }
        });

        // 初始化
        renderSessions();
        if (logs.length > 0) selectSession(0);
    </script>
</body>
</html>
"@

    # 保存 HTML
    $HtmlTemplate | Out-File -FilePath $OutputPath -Encoding UTF8

    Write-Host "✅ HTML 查看器已生成: $OutputPath" -ForegroundColor Green
    return $OutputPath
}
```

---

### 6.2 Out-ConsoleGridView 快速实现

```powershell
function Show-LogsGrid {
    <#
    .SYNOPSIS
        Quick log viewer using Out-ConsoleGridView
        使用 Out-ConsoleGridView 快速查看日志
    #>
    [CmdletBinding()]
    param()

    $LogPath = "$PSScriptRoot\logs"

    # 读取日志
    $Sessions = Get-ChildItem -Path $LogPath -Filter "*.json" |
        ForEach-Object {
            $Content = Get-Content $_.FullName | ConvertFrom-Json
            [PSCustomObject]@{
                SessionID = $Content.SessionID
                Timestamp = [datetime]$Content.Timestamp
                Message = $Content.Message
                Duration = "$($Content.Duration)s"
                FilePath = $_.FullName
            }
        } |
        Sort-Object Timestamp -Descending

    # 显示并选择
    $Selected = $Sessions |
        Out-ConsoleGridView -Title "🎮 Pip-Boy 日志查看器" -OutputMode Single

    # 显示详情
    if ($Selected) {
        $Details = Get-Content $Selected.FilePath | ConvertFrom-Json

        Write-Host "`n" -NoNewline
        Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║       ROBCO INDUSTRIES - SESSION DETAILS        ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green

        $Details | Format-List

        Write-Host "`n按任意键返回..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

        # 递归调用，继续浏览
        Show-LogsGrid
    }
}
```

---

## 七、最终建议

### 🎯 **短期方案（MVP）**

**第 1 阶段**（1-2 天）：
```powershell
# 快速实现基础功能
Install-Module Microsoft.PowerShell.ConsoleGuiTools
function Show-QuickLogs {
    Get-ChildItem "$PSScriptRoot\logs\*.json" |
        ForEach-Object { Get-Content $_ | ConvertFrom-Json } |
        Out-ConsoleGridView -Title "Ollama Logs"
}
```

---

### 🚀 **长期方案（完整实现）**

**第 2 阶段**（2-3 周）：
- 开发完整 HTML Pip-Boy 界面
- 实现 PowerShell 数据导出管道
- 添加过滤、排序、搜索功能
- 集成到项目主模块

**第 3 阶段**（可选）：
- 添加实时日志监控（WebSocket）
- 开发 Terminal.Gui 高级 TUI
- 支持日志导出为多种格式

---

### 📊 **决策矩阵**

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| **快速验证需求** | Out-ConsoleGridView | 5 分钟上手，0 学习成本 |
| **日常运维使用** | Terminal.Gui | 原生终端体验，性能高 |
| **展示/演示** | HTML Pip-Boy | 视觉冲击力强，沉浸感好 |
| **开源项目发布** | 混合方案 | 满足不同用户偏好 |

---

## 八、参考资源汇总

### 📚 **HTML/CSS CRT 效果**
- [DEV: Retro CRT Terminal Screen](https://dev.to/ekeijl/retro-crt-terminal-screen-in-css-js-4afh)
- [GitHub: HairyDuck/terminal](https://github.com/HairyDuck/terminal)
- [CodePen: Fallout Terminal Collection](https://codepen.io/tag/fallout-terminal)
- [CSS-Tricks: Old Timey Terminal](https://css-tricks.com/old-timey-terminal-styling/)

### 📚 **PowerShell TUI**
- [IronmanSoftware: TUI Guide](https://blog.ironmansoftware.com/tui-powershell/)
- [GitHub: PowerShell/ConsoleGuiTools](https://github.com/PowerShell/ConsoleGuiTools)
- [Terminal.Gui Official Docs](https://gui-cs.github.io/Terminal.Gui/)

### 📚 **日志查看器参考**
- [GitHub: lnav](https://github.com/tstack/lnav)
- [lnav Hotkey Reference](https://docs.lnav.org/en/latest/hotkeys.html)

---

**调研完成时间**：2025-01-16
**总工作量估算**：
- MVP（Out-ConsoleGridView）：**4 小时**
- 标准（Terminal.Gui）：**30 小时**
- 完整（HTML Pip-Boy）：**40 小时**

**下一步行动**：
1. ✅ 先实现 Out-ConsoleGridView 版本验证需求
2. ⏳ 评估用户反馈决定是否投入 HTML 版本开发
3. ⏳ 根据使用频率决定是否开发 Terminal.Gui 高级版本
