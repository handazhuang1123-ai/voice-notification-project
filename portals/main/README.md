# Pip-Boy Portal - 主入口门户

> **UI风格**: Pip-Boy 3000 Mark IV
> **版本**: 1.0.0
> **创建者**: 壮爸

## 功能介绍

统一的服务入口门户，采用经典的 Pip-Boy 界面风格，集成以下子系统：

- **日志查看器** (Log Viewer) - 端口 55555
- **个人画像系统** (Profile System) - 端口 3002
- **RAG 知识库** (即将推出) - 端口 3003

## 界面特色

- 🖥️ **完美的 CRT 效果** - 扫描线动画、屏幕闪烁、绿色荧光效果
- 🎮 **经典 Pip-Boy UI** - 还原辐射游戏经典界面
- 📊 **五大功能标签**：
  - **STAT** - 系统状态仪表盘
  - **INV** - 服务清单管理
  - **DATA** - 数据中心（日志、画像、搜索）
  - **MAP** - 系统架构地图
  - **RADIO** - 通信中心

## 快速启动

### 方式一：使用启动脚本（推荐）

Windows 用户双击运行：
```bash
portals/main/start.cmd
```

或使用 PowerShell：
```powershell
.\portals\main\scripts\start-all.ps1
```

### 方式二：手动启动

1. **启动日志查看器**
```bash
cd viewers/log-viewer
python -m http.server 55555
```

2. **启动个人画像系统**
```bash
node scripts/profile/start.js
```

3. **启动主门户**
```bash
cd portals/main
npm run dev
```

## 访问地址

- **主门户**: http://localhost:3000
- **日志查看器**: http://localhost:55555
- **个人画像系统**: http://localhost:3002

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **路由**: React Router v6
- **UI样式**: Tailwind CSS
- **反向代理**: Vite Proxy Configuration

## 目录结构

```
portals/main/
├── src/
│   ├── components/PipBoy/   # Pip-Boy UI组件
│   │   ├── CRTScreen.tsx   # CRT效果容器
│   │   ├── TabBar.tsx      # 顶部标签栏
│   │   ├── SideMenu.tsx    # 左侧菜单
│   │   └── StatusBar.tsx   # 底部状态栏
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx   # STAT - 仪表盘
│   │   ├── Inventory.tsx   # INV - 服务清单
│   │   ├── Data.tsx       # DATA - 数据中心
│   │   ├── Map.tsx        # MAP - 系统地图
│   │   └── Radio.tsx      # RADIO - 通信中心
│   ├── App.tsx            # 主应用组件
│   └── main.tsx          # 入口文件
├── scripts/
│   └── start-all.ps1     # PowerShell启动脚本
└── start.cmd            # Windows批处理启动脚本
```

## 开发指南

### 安装依赖
```bash
cd portals/main
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 反向代理配置

主门户通过反向代理访问各子服务：

```typescript
// vite.config.ts
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
```

## 注意事项

1. 确保 Python 和 Node.js 已安装
2. 首次运行前请执行 `npm install` 安装依赖
3. 个人画像系统需要先初始化数据库
4. 日志查看器需要 `data/logs.json` 文件

## 许可证

MIT License

---

**War... War Never Changes** 🎮