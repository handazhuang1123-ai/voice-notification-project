# Pip-Boy 网页端应用复刻方案

> 文档生成日期: 2025-12-09
> 游戏版本: Fallout 4

---

## 一、资源文件发现

### 关键源文件位置

```
D:\...\Fallout 4\Data\
├── Fallout4 - Interface.ba2    ← 主要UI资源（467MB）
│   ├── Interface/
│   │   ├── PipboyMenu.swf      ← Pip-Boy主界面
│   │   ├── HUDMenu.swf         ← HUD显示
│   │   ├── *.xml               ← UI配置
│   │   └── *.dds               ← 纹理贴图
│   └── Strings/                ← 多语言文本
├── Fallout4.esm                ← 游戏脚本逻辑（316MB）
├── Fallout4 - Sounds.ba2       ← 音效资源
└── Pip-Boy皮肤文件:
    ├── ccBGSFO4001-PipBoy(Black) - Main.ba2 / Textures.ba2
    ├── ccBGSFO4003-PipBoy(Camo01) - Main.ba2 / Textures.ba2
    ├── ccBGSFO4004-PipBoy(Camo02) - Main.ba2 / Textures.ba2
    └── ccBGSFO4006-PipBoy(Chrome) - Main.ba2 / Textures.ba2
```

### 配置文件引用

从 `Fallout4_Default.ini` 中发现的关键配置:
```ini
[General]
sValidNameCharsFile=Interface\FontConfig_cn.txt

[Fonts]
sFontConfigFile=Interface\FontConfig_cn.txt

[Archive]
sResourceStartUpArchiveList=Fallout4 - Startup.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2
```

---

## 二、资源提取工具清单

| 工具名称 | 用途 | 下载来源 |
|---------|------|----------|
| **BAE (Bethesda Archive Extractor)** | 解压 `.ba2` 文件 | Nexus Mods |
| **JPEXS Free Flash Decompiler** | 反编译 `.swf` Flash文件 | github.com/jindrapetrik/jpexs-decompiler |
| **NifSkope** | 查看/编辑 `.nif` 3D模型 | github.com/niftools/nifskope |
| **xEdit (FO4Edit)** | 查看 `.esm` 游戏数据 | Nexus Mods |
| **Paint.NET / GIMP** | 编辑 `.dds` 纹理文件 | 官网 |

---

## 三、Pip-Boy核心功能模块

### 主要功能页面

| 页面 | 功能描述 | 技术实现要点 |
|------|---------|-------------|
| **STAT（状态）** | HP、AP、等级、S.P.E.C.I.A.L属性 | 数据绑定、进度条、雷达图 |
| **INV（物品）** | 武器、护甲、援助物品、杂项、弹药 | 分类列表、搜索过滤、物品详情 |
| **DATA（数据）** | 任务、地图、电台 | 任务追踪、互动地图、音频播放 |
| **MAP（地图）** | 世界地图、本地地图 | 可缩放地图、标记点、导航 |
| **RADIO（电台）** | 电台列表、播放控制 | 音频流、播放器UI |

### 视觉特征

- **标志性绿色**: `#10FF10` (CRT显示器效果)
- **扫描线效果**: 水平条纹覆盖层
- **CRT曲面**: 边缘轻微弯曲变形
- **荧光发光**: 文字和边框发光效果
- **噪点/闪烁**: 模拟老式显示器

---

## 四、技术实现方案

### 推荐技术栈

```
前端框架:  React 18 / Vue 3
样式方案:  Tailwind CSS + 自定义CSS动画
状态管理:  Zustand / Pinia
路由:      React Router / Vue Router
动画:      Framer Motion / GSAP
音频:      Howler.js
地图:      Leaflet.js（自定义瓦片）
构建工具:  Vite
```

### 项目结构建议

```
pip-boy-app/
├── public/
│   ├── assets/
│   │   ├── images/        # 从游戏提取的UI贴图
│   │   ├── sounds/        # 音效文件
│   │   └── fonts/         # Pip-Boy字体
├── src/
│   ├── components/
│   │   ├── PipBoyFrame/   # 外框组件（含CRT效果）
│   │   ├── StatPage/      # STAT页面
│   │   ├── InventoryPage/ # INV页面
│   │   ├── DataPage/      # DATA页面
│   │   ├── MapPage/       # 地图页面
│   │   └── RadioPage/     # 电台页面
│   ├── hooks/             # 自定义Hooks
│   ├── stores/            # 状态管理
│   ├── styles/
│   │   ├── crt-effects.css  # CRT视觉效果
│   │   └── pip-boy.css      # 主题样式
│   └── utils/             # 工具函数
├── package.json
└── vite.config.js
```

### CRT效果CSS核心代码

```css
/* pip-boy主题色 */
:root {
  --pip-green: #10FF10;
  --pip-green-dark: #0A8C0A;
  --pip-bg: #0A0A0A;
}

/* 扫描线效果 */
.scanlines::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}

/* CRT屏幕曲面效果 */
.crt-screen {
  border-radius: 20px;
  box-shadow:
    inset 0 0 50px rgba(16, 255, 16, 0.1),
    0 0 20px rgba(16, 255, 16, 0.3);
  filter: contrast(1.1) brightness(1.05);
}

/* 发光文字 */
.glow-text {
  color: var(--pip-green);
  text-shadow:
    0 0 5px var(--pip-green),
    0 0 10px var(--pip-green),
    0 0 20px var(--pip-green-dark);
}

/* 屏幕闪烁动画 */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.8; }
  94% { opacity: 1; }
}
```

---

## 五、开发材料清单

### 需要从游戏提取的资源

1. **UI贴图** (从 `Fallout4 - Interface.ba2`)
   - Pip-Boy边框纹理
   - 图标集（武器、护甲、物品图标）
   - 按钮样式
   - 背景纹理

2. **字体文件**
   - Monofonto (Pip-Boy主字体)
   - Roboto Condensed (备用)

3. **音效** (从 `Fallout4 - Sounds.ba2`)
   - 页面切换音
   - 按钮点击音
   - 电台静电噪音
   - Pip-Boy开关机音

4. **地图贴图** (从 `Fallout4 - Textures*.ba2`)
   - 联邦地图
   - 位置标记图标

### 数据结构示例

```json
{
  "character": {
    "name": "Sole Survivor",
    "level": 50,
    "hp": { "current": 340, "max": 340 },
    "ap": { "current": 100, "max": 100 },
    "xp": { "current": 45000, "next": 50000 },
    "special": {
      "S": 6, "P": 4, "E": 5,
      "C": 6, "I": 7, "A": 5, "L": 7
    }
  },
  "inventory": [...],
  "quests": [...],
  "locations": [...]
}
```

---

## 六、实现步骤

### 阶段一：资源准备
1. 使用BAE解压 `Fallout4 - Interface.ba2`
2. 使用JPEXS反编译SWF文件，获取布局参考
3. 提取并转换所需贴图为PNG/WebP格式
4. 收集音效文件

### 阶段二：基础框架
1. 搭建项目脚手架
2. 实现Pip-Boy外框组件（含CRT效果）
3. 实现底部导航Tab切换
4. 配置路由和状态管理

### 阶段三：功能页面
1. STAT页面（属性展示）
2. INV页面（物品列表）
3. DATA页面（任务/笔记）
4. MAP页面（互动地图）
5. RADIO页面（电台播放）

### 阶段四：效果优化
1. 添加音效反馈
2. 优化CRT视觉效果
3. 添加屏幕闪烁/噪点动画
4. 响应式适配（桌面/平板/手机）

---

## 七、扩展功能建议

| 功能 | 描述 |
|------|------|
| **主题切换** | 支持不同颜色的Pip-Boy（琥珀色、白色、蓝色） |
| **数据导入** | 支持导入游戏存档数据 |
| **PWA支持** | 可安装为桌面/移动应用 |
| **手表模式** | 适配智能手表的简化界面 |
| **语音控制** | "OK, Pip-Boy"语音唤醒 |

---

## 八、参考资源

- [Fallout Wiki - Pip-Boy](https://fallout.fandom.com/wiki/Pip-Boy)
- [Nexus Mods - Fallout 4](https://www.nexusmods.com/fallout4)
- [Bethesda Archive Extractor](https://www.nexusmods.com/fallout4/mods/78)
- [JPEXS Free Flash Decompiler](https://github.com/jindrapetrik/jpexs-decompiler)

---

*本文档基于 Fallout 4 游戏目录分析生成*
