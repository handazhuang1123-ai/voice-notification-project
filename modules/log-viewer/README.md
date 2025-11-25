# Log Viewer Module

> Pip-Boy 风格日志查看器模块

## 目录结构

```
log-viewer/
├── backend/           # TypeScript + Express 后端
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── log-parser.ts
│   │   ├── file-watcher.ts
│   │   └── export-logs.ts
│   └── package.json
│
├── frontend/          # React + TypeScript 前端
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── types/        # TypeScript 类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
├── data/              # 数据文件
│   └── logs.json
│
├── config.json        # 模块配置
└── README.md
```

## 运行

```bash
# 后端开发模式
cd backend
pnpm dev

# 前端开发模式（需要先启动后端）
cd frontend
pnpm dev

# 生产模式
cd backend && pnpm build && pnpm start
cd frontend && pnpm build
```

## 端口

- Backend API: 3001
- Frontend Dev: 3001 (proxied)

## 技术栈

- **后端**: Express 5 + TypeScript + Chokidar
- **前端**: React 19 + TypeScript + Tailwind CSS v4
- **主题**: Pip-Boy CRT 风格

## 功能

- 日期分组浏览
- 会话详情查看
- 键盘导航 (↑↓←→, Enter, Esc, Home, End)
- 无限滚动加载
- 长轮询实时更新

## 状态

- [x] 后端迁移
- [x] 前端 React 化
- [ ] 集成到主门户
