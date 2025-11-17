# Pip-Boy Theme

> **Fallout-inspired retro CRT terminal theme for web applications**
>
> 为 Web 应用提供 Fallout 风格的复古 CRT 终端主题

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](./package.json)

---

## 📋 Overview | 概述

Pip-Boy Theme is a standalone CSS/JavaScript theme package that recreates the iconic green phosphor CRT monitor aesthetic from the Fallout game series. Perfect for log viewers, terminals, dashboards, or any retro-futuristic web interface.

Pip-Boy 主题是一个独立的 CSS/JavaScript 主题包，重现了 Fallout 游戏系列中标志性的绿色荧光 CRT 显示器美学。适用于日志查看器、终端、仪表板或任何复古未来主义风格的 Web 界面。

### ✨ Features | 特性

- 🎨 **Authentic CRT Effects** | **真实的 CRT 效果**
  - Horizontal scanlines with animation | 带动画的水平扫描线
  - Screen flicker simulation | 屏幕闪烁模拟
  - Multi-layer phosphor glow | 多层荧光发光效果

- 🧩 **Modular Design** | **模块化设计**
  - Separate CSS files for colors, base, CRT effects, and components
  - 分离的 CSS 文件（颜色、基础、CRT 特效、组件）

- ⌨️ **Keyboard Navigation** | **键盘导航**
  - Built-in arrow key navigation for lists
  - 内置列表箭头键导航

- 📦 **Zero Dependencies** | **零依赖**
  - Pure vanilla JavaScript and CSS
  - 纯原生 JavaScript 和 CSS

- ♿ **Accessibility** | **无障碍性**
  - Respects `prefers-reduced-motion`
  - 尊重 `prefers-reduced-motion` 设置

---

## 🚀 Quick Start | 快速开始

### Installation | 安装

```bash
# Clone or copy the pip-boy-theme directory
# 克隆或复制 pip-boy-theme 目录
```

### Basic Usage | 基本用法

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- Include CSS files | 引入 CSS 文件 -->
    <link rel="stylesheet" href="path/to/pip-boy-theme/css/pip-boy-colors.css">
    <link rel="stylesheet" href="path/to/pip-boy-theme/css/pip-boy-base.css">
    <link rel="stylesheet" href="path/to/pip-boy-theme/css/pip-boy-crt.css">
    <link rel="stylesheet" href="path/to/pip-boy-theme/css/pip-boy-components.css">
</head>
<body>
    <div class="pip-boy-container pip-boy-scanlines pip-boy-flicker">
        <div class="pip-boy-screen pip-boy-box-glow">
            <div class="pip-boy-content">
                <h1 class="pip-boy-glow-multi">ROBCO INDUSTRIES</h1>
                <p>Your content here...</p>
            </div>
        </div>
    </div>

    <!-- Include JavaScript | 引入 JavaScript -->
    <script src="path/to/pip-boy-theme/js/keyboard-navigation.js"></script>
    <script src="path/to/pip-boy-theme/js/data-loader.js"></script>
</body>
</html>
```

### Demo | 演示

Open `demo/index.html` in your browser to see all components and effects in action.

在浏览器中打开 `demo/index.html` 查看所有组件和效果的演示。

---

## 📖 Documentation | 文档

### CSS Modules | CSS 模块

#### 1. `pip-boy-colors.css` - Color Palette | 颜色配色

Defines all color variables used throughout the theme.

定义主题中使用的所有颜色变量。

```css
:root {
    --pip-boy-green: #4af626;       /* Main UI color */
    --pip-boy-bg: #0a0a0a;          /* Background */
    --pip-boy-text-primary: #4af626; /* Primary text */
    /* ... more variables ... */
}
```

#### 2. `pip-boy-base.css` - Base Styles | 基础样式

Core layout, typography, and container styles.

核心布局、排版和容器样式。

**Key Classes | 主要类**:
- `.pip-boy-container` - Main wrapper
- `.pip-boy-screen` - Screen area
- `.pip-boy-content` - Content padding
- `.pip-boy-layout-master-detail` - Master-detail layout (30%/70%)

#### 3. `pip-boy-crt.css` - CRT Effects | CRT 特效

Visual effects for authentic CRT monitor simulation.

用于真实 CRT 显示器模拟的视觉效果。

**Key Classes | 主要类**:
- `.pip-boy-scanlines` - Horizontal scanlines
- `.pip-boy-flicker` - Screen flicker animation
- `.pip-boy-glow` - Single-layer text glow
- `.pip-boy-glow-multi` - Multi-layer phosphor glow
- `.pip-boy-boot` - Power-on animation

#### 4. `pip-boy-components.css` - UI Components | UI 组件

Reusable styled components.

可复用的样式组件。

**Components | 组件**:
- **Panels** | **面板**: `.pip-boy-panel`, `.pip-boy-frame`
- **Lists** | **列表**: `.pip-boy-list`, `.pip-boy-list-item`
- **Buttons** | **按钮**: `.pip-boy-button`
- **Tables** | **表格**: `.pip-boy-table`
- **Forms** | **表单**: `.pip-boy-input`, `.pip-boy-checkbox`
- **Badges** | **徽章**: `.pip-boy-badge-success/warning/error/info`

### JavaScript Modules | JavaScript 模块

#### 1. `keyboard-navigation.js` - Keyboard Navigation | 键盘导航

Provides keyboard navigation for lists and menus.

为列表和菜单提供键盘导航。

```javascript
// Initialize navigator | 初始化导航器
const nav = new PipBoyKeyboardNav('.pip-boy-list-item');

// Set callbacks | 设置回调
nav.onSelect = (item, index) => {
    console.log('Selected:', item);
};

nav.onChange = (item, index) => {
    console.log('Changed to:', item);
};

// Refresh items after DOM changes | DOM 变化后刷新项目
nav.refresh();
```

**Keyboard Shortcuts | 键盘快捷键**:
- `↑↓` - Navigate up/down | 上下导航
- `Home/End` - Jump to first/last | 跳转到首/尾
- `Enter` - Select item | 选择项目
- `Escape` - Cancel/go back | 取消/返回

#### 2. `data-loader.js` - Data Loader | 数据加载器

Generic JSON data loading with caching and retry logic.

通用 JSON 数据加载，带缓存和重试逻辑。

```javascript
// Create loader | 创建加载器
const loader = new PipBoyDataLoader({
    cache: true,
    retries: 3
});

// Load data | 加载数据
try {
    const data = await loader.load('data/logs.json');
    console.log('Loaded:', data);
} catch (error) {
    console.error('Load failed:', error);
}
```

---

## 🎨 Customization | 自定义

### Change Colors | 更改颜色

Override CSS variables in your own stylesheet:

在你自己的样式表中覆盖 CSS 变量：

```css
:root {
    --pip-boy-green: #00ff00;  /* Brighter green */
    --pip-boy-bg: #000000;     /* Pure black */
}
```

### Disable Effects | 禁用效果

Remove class names to disable specific effects:

移除类名以禁用特定效果：

```html
<!-- No scanlines | 无扫描线 -->
<div class="pip-boy-container pip-boy-flicker">

<!-- No flicker | 无闪烁 -->
<div class="pip-boy-container pip-boy-scanlines">

<!-- Static scanlines (no animation) | 静态扫描线（无动画） -->
<div class="pip-boy-container pip-boy-scanlines pip-boy-scanlines-static">
```

### Performance Mode | 性能模式

Add `.pip-boy-low-perf` class to disable heavy effects:

添加 `.pip-boy-low-perf` 类以禁用高负载效果：

```html
<div class="pip-boy-container pip-boy-scanlines pip-boy-low-perf">
```

---

## 📁 File Structure | 文件结构

```
pip-boy-theme/
├── css/
│   ├── pip-boy-colors.css      # Color variables | 颜色变量
│   ├── pip-boy-base.css        # Base styles | 基础样式
│   ├── pip-boy-crt.css         # CRT effects | CRT 特效
│   └── pip-boy-components.css  # UI components | UI 组件
├── js/
│   ├── keyboard-navigation.js  # Keyboard nav | 键盘导航
│   └── data-loader.js          # Data loading | 数据加载
├── fonts/
│   └── (VT323 font files)      # Terminal font | 终端字体
├── demo/
│   └── index.html              # Demo page | 演示页面
├── README.md                   # This file | 本文件
├── package.json                # Package metadata | 包元数据
└── LICENSE                     # MIT license | MIT 许可证
```

---

## 🌐 Browser Support | 浏览器支持

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

---

## 📜 License | 许可证

MIT License - See [LICENSE](./LICENSE) file for details.

MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

---

## 🙏 Credits | 致谢

Inspired by:
- Fallout game series (Bethesda/Interplay)
- Various retro terminal themes and CodePen examples

灵感来源：
- Fallout 游戏系列（Bethesda/Interplay）
- 各种复古终端主题和 CodePen 示例

---

## 🛠️ Changelog | 更新日志

### v1.0.0 (2025-01-17)
- Initial release | 初始发布
- Complete CRT effect suite | 完整的 CRT 效果套件
- Keyboard navigation support | 键盘导航支持
- Data loading utilities | 数据加载工具

---

**Maintained by | 维护者**: 壮爸
**Project | 项目**: PowerShell Voice Notification System
