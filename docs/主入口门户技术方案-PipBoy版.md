# 主入口门户技术方案（Pip-Boy UI 版）

> **项目代号**: Main Portal
> **版本**: 1.0.0
> **创建日期**: 2025-11-24
> **作者**: 壮爸
> **UI风格**: Pip-Boy 3000 Mark IV

---

## 1. 项目概述

### 1.1 背景
当前项目包含多个独立运行的子系统：
- **日志查看器** (端口 55555)
- **个人画像系统** (端口 3002)
- 未来还会有更多模块

需要一个统一的入口门户来集成这些子系统，采用经典的 Pip-Boy 界面风格。

### 1.2 目标
- 提供统一的访问入口
- 实现单点登录（SSO）
- 完美还原 Pip-Boy 主题
- 按需启动各子服务
- 学习现代前端架构

---

## 2. 技术架构

### 2.1 技术栈
```
前端框架：React 18 + TypeScript
构建工具：Vite 5
路由：React Router v6
状态管理：Zustand
UI组件：shadcn/ui + Tailwind CSS
HTTP客户端：Axios
反向代理：http-proxy-middleware
认证：JWT + localStorage
动画库：Framer Motion（CRT效果）
```

### 2.2 架构设计

```
用户浏览器
    ↓
http://localhost:3000 (主入口)
    ↓
Vite Dev Server (开发) / Express (生产)
    ↓
反向代理中间件
    ├── /api/log/* → http://localhost:55555
    ├── /api/profile/* → http://localhost:3002
    └── /api/auth/* → 本地认证服务
```

### 2.3 反向代理配置

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/log': {
        target: 'http://localhost:55555',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/log/, '')
      },
      '/api/profile': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, '/api')
      }
    }
  }
})
```

---

## 3. 项目结构

```
portals/main/
├── src/
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # STAT - 仪表盘
│   │   ├── Inventory.tsx         # INV - 服务清单
│   │   ├── Data.tsx             # DATA - 数据中心
│   │   │   ├── LogViewer.tsx   # 日志查看器容器
│   │   │   └── Profile.tsx     # 个人画像容器
│   │   ├── Map.tsx              # MAP - 系统地图
│   │   └── Radio.tsx            # RADIO - 通信中心
│   ├── components/              # 通用组件
│   │   ├── PipBoy/
│   │   │   ├── TabBar.tsx      # 顶部标签栏
│   │   │   ├── SideMenu.tsx    # 左侧菜单
│   │   │   ├── StatusBar.tsx   # 底部状态栏
│   │   │   ├── CRTScreen.tsx   # CRT效果容器
│   │   │   └── Scanner.tsx     # 扫描线效果
│   │   └── ServiceManager/     # 服务管理组件
│   │       ├── ServiceCard.tsx # 服务卡片
│   │       └── ServiceStatus.tsx # 服务状态
│   ├── services/               # API服务
│   │   ├── auth.service.ts    # 认证服务
│   │   ├── proxy.service.ts   # 代理服务
│   │   └── process.service.ts # 进程管理
│   ├── stores/                # Zustand状态管理
│   │   ├── authStore.ts       # 认证状态
│   │   ├── serviceStore.ts    # 服务状态
│   │   └── pipboyStore.ts     # Pip-Boy UI状态
│   ├── styles/                # 样式文件
│   │   ├── pip-boy-theme.css  # Pip-Boy主题
│   │   ├── crt-effects.css    # CRT特效
│   │   └── globals.css        # 全局样式
│   ├── App.tsx                # 主应用组件
│   └── main.tsx               # 入口文件
├── public/
│   ├── sounds/                # UI音效
│   │   ├── tab-switch.mp3    # 标签切换音
│   │   ├── menu-select.mp3   # 菜单选择音
│   │   └── boot-up.mp3       # 启动音
│   └── fonts/                # 字体文件
│       └── fixedsys.ttf      # 终端字体
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 4. UI设计（基于 Pip-Boy 3000）

### 4.1 布局结构

```
┌──────────────────────────────────────────────────────────┐
│ [ STAT ] [ INV ] [ DATA ] [ MAP ] [ RADIO ] 📶 ⚡ HP:100│ ← 顶部标签栏
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┬───────────────────────────────┐       │
│  │ Dashboard   │                                 │       │
│  │ ─────────   │                                 │       │
│  │ Log Viewer  │                                 │       │
│  │    2        │      Main Content Area         │       │
│  │ Profile     │                                 │       │
│  │    1        │     (Dynamic Loading)          │       │
│  │ RAG Search  │                                 │       │
│  │    0        │                                 │       │
│  │ Settings    │                                 │       │
│  │ ─────────   │                                 │       │
│  │ About       │                                 │       │
│  └─────────────┴───────────────────────────────┘       │
│                                                          │
│ 🎚️ 56/100 ═══════════════════───── LVL 1  AP 10/10    │ ← 底部状态栏
└──────────────────────────────────────────────────────────┘
```

### 4.2 标签定义

| 标签 | 全称 | 功能 | 包含模块 |
|------|------|------|----------|
| STAT | Status | 系统状态 | Dashboard、系统监控 |
| INV | Inventory | 服务清单 | 所有可用服务列表 |
| DATA | Data | 数据中心 | 日志查看器、个人画像、RAG搜索 |
| MAP | Map | 系统地图 | 架构图、服务拓扑 |
| RADIO | Radio | 通信中心 | 通知、消息、设置 |

### 4.3 组件实现

```tsx
// components/PipBoy/TabBar.tsx
export function TabBar() {
  const tabs = ['STAT', 'INV', 'DATA', 'MAP', 'RADIO'];
  const [activeTab, setActiveTab] = useState('DATA');

  return (
    <div className="pip-boy-tabs">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => {
            playSound('tab-switch');
            setActiveTab(tab);
          }}
        >
          [ {tab} ]
        </button>
      ))}
      <div className="status-icons">
        <span>📶</span> {/* 网络状态 */}
        <span>⚡</span> {/* 服务状态 */}
        <span>HP:100</span> {/* 系统健康度 */}
      </div>
    </div>
  );
}
```

```tsx
// components/PipBoy/SideMenu.tsx
export function SideMenu({ items }: { items: MenuItem[] }) {
  return (
    <div className="pip-boy-menu">
      {items.map(item => (
        <div key={item.id} className="menu-item">
          <span className="menu-text">{item.label}</span>
          {item.notifications > 0 && (
            <span className="notification-badge">
              {item.notifications}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4.4 主题样式

```css
/* styles/pip-boy-theme.css */
:root {
  --pip-green: #41ff00;
  --pip-green-bright: #5aff19;
  --pip-green-dim: #29cc00;
  --pip-amber: #ffb000;
  --pip-bg: #000500;
  --pip-shadow: rgba(65, 255, 0, 0.5);
}

/* CRT 效果 */
.crt-container {
  position: relative;
  background: var(--pip-bg);
  color: var(--pip-green);
  font-family: 'Fixedsys', 'Courier New', monospace;
  text-shadow: 0 0 5px var(--pip-shadow);
}

/* 扫描线效果 */
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.scanline {
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    transparent,
    var(--pip-green) 50%,
    transparent
  );
  animation: scanline 8s linear infinite;
  opacity: 0.1;
}

/* 闪烁效果 */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.96; }
}

.pip-boy-screen {
  animation: flicker 0.15s infinite;
}

/* 标签样式 */
.pip-boy-tabs {
  display: flex;
  gap: 2px;
  padding: 10px;
  border-bottom: 2px solid var(--pip-green);
}

.tab {
  background: transparent;
  color: var(--pip-green-dim);
  border: 1px solid var(--pip-green-dim);
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active,
.tab:hover {
  background: var(--pip-green);
  color: var(--pip-bg);
  box-shadow: 0 0 10px var(--pip-shadow);
}

/* 菜单项 */
.menu-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.menu-item:hover {
  background: rgba(65, 255, 0, 0.1);
  border-left-color: var(--pip-green);
}

.notification-badge {
  background: var(--pip-amber);
  color: var(--pip-bg);
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 0.8em;
  font-weight: bold;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
  border-top: 2px solid var(--pip-green);
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: rgba(65, 255, 0, 0.1);
  border: 1px solid var(--pip-green);
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--pip-green);
  box-shadow: 0 0 10px var(--pip-shadow);
}
```

---

## 5. 核心功能实现

### 5.1 主应用组件

```tsx
// App.tsx
import { CRTScreen } from '@/components/PipBoy/CRTScreen';
import { TabBar } from '@/components/PipBoy/TabBar';
import { SideMenu } from '@/components/PipBoy/SideMenu';
import { StatusBar } from '@/components/PipBoy/StatusBar';
import { useTabNavigation } from '@/hooks/useTabNavigation';

export function App() {
  const { activeTab, menuItems, content } = useTabNavigation();

  useEffect(() => {
    // 播放启动音效
    playSound('boot-up');
  }, []);

  return (
    <CRTScreen>
      <div className="pip-boy-container">
        <TabBar activeTab={activeTab} />

        <div className="main-layout">
          <SideMenu items={menuItems} />
          <div className="content-area">
            {content}
          </div>
        </div>

        <StatusBar />
      </div>
    </CRTScreen>
  );
}
```

### 5.2 服务集成（DATA标签下）

```tsx
// pages/Data.tsx
export function DataPage() {
  const [activeService, setActiveService] = useState<string>('log-viewer');

  const services = [
    { id: 'log-viewer', name: 'Log Viewer', notifications: 2 },
    { id: 'profile', name: 'Profile', notifications: 1 },
    { id: 'rag-search', name: 'RAG Search', notifications: 0 },
  ];

  return (
    <>
      <SideMenu
        items={services}
        onSelect={setActiveService}
      />
      <div className="service-content">
        {activeService === 'log-viewer' && <LogViewer />}
        {activeService === 'profile' && <Profile />}
        {activeService === 'rag-search' && <RAGSearch />}
      </div>
    </>
  );
}
```

---

## 6. 音效系统

```typescript
// utils/sound.ts
const sounds: Record<string, HTMLAudioElement> = {};

export function initSounds() {
  const soundFiles = {
    'tab-switch': '/sounds/tab-switch.mp3',
    'menu-select': '/sounds/menu-select.mp3',
    'boot-up': '/sounds/boot-up.mp3',
  };

  Object.entries(soundFiles).forEach(([key, path]) => {
    sounds[key] = new Audio(path);
    sounds[key].volume = 0.3;
  });
}

export function playSound(soundName: string) {
  if (sounds[soundName]) {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play();
  }
}
```

---

## 7. 实施计划

### 第一阶段：基础框架（Day 1 上午）
- [x] 创建 Vite + React + TypeScript 项目
- [ ] 实现 Pip-Boy 布局组件
- [ ] 配置主题和 CRT 效果
- [ ] 实现标签导航

### 第二阶段：服务集成（Day 1 下午）
- [ ] 配置反向代理
- [ ] 实现服务管理器
- [ ] 集成日志查看器
- [ ] 集成个人画像系统

### 第三阶段：认证系统（Day 2 上午）
- [ ] 实现 JWT 认证
- [ ] 创建登录界面（Pip-Boy 风格）
- [ ] 实现认证状态管理
- [ ] 添加路由守卫

### 第四阶段：完善体验（Day 2 下午）
- [ ] 添加音效系统
- [ ] 优化动画效果
- [ ] 实现状态栏功能
- [ ] 完善响应式设计

---

## 8. 特色功能

1. **完美的 CRT 效果**
   - 扫描线动画
   - 屏幕闪烁
   - 绿色荧光效果

2. **沉浸式音效**
   - UI 操作音效
   - 启动音效
   - 通知提示音

3. **动态状态显示**
   - 服务健康度（HP）
   - 系统负载（AP）
   - 用户等级（LVL）

4. **智能服务管理**
   - 按需启动
   - 状态监控
   - 故障自愈

---

**准备就绪**：此方案完美还原 Pip-Boy 界面，提供专业的用户体验！