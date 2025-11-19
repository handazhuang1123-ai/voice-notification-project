# Node.js Log Viewer Server

Node.js/TypeScript 版本的 Pip-Boy 日志查看器服务器，使用 Express + chokidar 实现高性能的实时日志更新。

## 📋 功能特性

- ✅ **静态文件服务** - 提供 HTML、CSS、JavaScript 静态文件
- ✅ **长轮询支持** - 实时日志更新，无阻塞
- ✅ **文件监听** - 使用 chokidar 监听日志文件变化
- ✅ **自动导出** - 日志文件变化时自动解析并导出 JSON
- ✅ **TypeScript** - 类型安全，代码质量有保障
- ✅ **ESLint 检查** - 自动代码质量检查
- ✅ **跨平台** - 支持 Windows、macOS、Linux

## 🚀 快速开始

### 前置要求

- **Node.js 18.0.0 或更高版本**
- **npm** (随 Node.js 一起安装)

检查 Node.js 版本：
```bash
node --version
```

如果未安装，请从 https://nodejs.org 下载安装。

### 一键启动

在项目根目录运行：

```powershell
# Windows PowerShell
.\scripts\viewers\log-viewers\Start-NodeLogViewer.ps1
```

脚本会自动完成以下步骤：
1. 检查 Node.js 安装
2. 安装依赖 (npm install)
3. 编译 TypeScript 代码 (npm run build)
4. 启动服务器 (npm start)
5. 在浏览器中打开日志查看器

### 快速启动（跳过检查）

如果依赖已安装且代码已编译，可以快速启动：

```powershell
.\scripts\viewers\log-viewers\Start-NodeLogViewer.ps1 -SkipDependencyCheck -SkipBuild
```

## 📁 项目结构

```
node-server/
├── src/                    # TypeScript 源码
│   ├── server.ts          # HTTP 服务器主文件
│   ├── export-logs.ts     # 日志导出脚本
│   ├── file-watcher.ts    # 文件监听模块
│   ├── log-parser.ts      # 日志解析模块
│   └── config.ts          # 配置管理模块
├── dist/                  # 编译后的 JavaScript（自动生成）
├── config.json            # 配置文件
├── package.json           # Node.js 项目配置
├── tsconfig.json          # TypeScript 编译配置
├── .eslintrc.json         # ESLint 规则配置
└── README.md             # 本文档
```

## ⚙️ 配置说明

配置文件位于 `config.json`：

```json
{
  "server": {
    "port": 55555,              // HTTP 服务器端口
    "host": "localhost"         // 监听地址
  },
  "paths": {
    "viewerRoot": "../../../viewers",              // 静态文件根目录
    "logFile": "../../../.claude/hooks/.../voice-unified.log",  // 日志文件路径
    "outputJson": "../../../viewers/log-viewer/data/logs.json"  // 输出 JSON 路径
  },
  "longPolling": {
    "timeoutSeconds": 30,       // 长轮询超时（秒）
    "checkIntervalMs": 500      // 更新检查间隔（毫秒）
  },
  "fileWatcher": {
    "debounceSeconds": 30,      // 防抖时间（秒）
    "writeDelayMs": 1000,       // 文件写入延迟（毫秒）
    "completionTimeoutSeconds": 3,  // 日志完成检查超时（秒）
    "completionMarker": "=== Voice Notification Completed ==="  // 完成标记
  }
}
```

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 启动服务器
npm start

# 开发模式（热重载）
npm run dev

# 运行 ESLint 检查
npm run lint

# 自动修复 ESLint 问题
npm run lint:fix

# 单独运行日志导出
npm run export
```

## 🔍 与 PowerShell 版本的对比

| 特性 | PowerShell 版本 | Node.js 版本 |
|------|----------------|--------------|
| **并发处理** | ❌ 单线程阻塞 | ✅ 异步非阻塞 |
| **长轮询** | ⚠️ 可能阻塞 | ✅ 完美支持 |
| **文件监听** | FileSystemWatcher | chokidar (更可靠) |
| **性能** | 低（单线程） | 高（事件驱动） |
| **维护性** | 中等 | 高（TypeScript） |
| **代码检查** | PSScriptAnalyzer | ESLint + TypeScript |
| **跨平台** | Windows Only | Windows/macOS/Linux |

## 🐛 故障排除

### 1. 端口被占用

**错误**: `Port 55555 is already in use`

**解决方法**:
- 修改 `config.json` 中的 `server.port` 为其他端口
- 或停止占用该端口的其他程序

### 2. Node.js 未安装

**错误**: `Node.js is not installed or not in PATH`

**解决方法**:
- 从 https://nodejs.org 下载并安装 Node.js 18.0.0 或更高版本
- 重启终端后重试

### 3. 依赖安装失败

**错误**: `npm install failed`

**解决方法**:
```bash
cd scripts/viewers/log-viewers/node-server
rm -rf node_modules
npm install
```

### 4. TypeScript 编译失败

**错误**: `TypeScript build failed`

**解决方法**:
- 检查错误信息，修复 TypeScript 代码错误
- 确保 TypeScript 版本兼容（已在 package.json 中指定）

## 📚 技术栈

- **Express 4.x** - Web 框架
- **chokidar 3.x** - 文件监听
- **TypeScript 5.x** - 类型安全
- **ESLint** - 代码质量检查
- **ts-node** - TypeScript 直接执行
- **nodemon** - 开发热重载

## 🔗 相关文档

- [Express 官方文档](https://expressjs.com/)
- [chokidar GitHub](https://github.com/paulmillr/chokidar)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [PowerShell 单线程阻塞问题调研报告](../../../docs/PowerShell-HttpListener单线程阻塞问题解决方案调研报告.md)

## 📝 更新日志

### v1.0.0 (2025-01-20)

- ✨ 完全迁移自 PowerShell 版本
- ✅ 实现所有原有功能
- ✅ 解决单线程阻塞问题
- ✅ 添加 TypeScript 类型安全
- ✅ 集成 ESLint 代码检查
- ✅ 添加 Git pre-commit hook 支持

## 👤 作者

**壮爸**

## 📄 许可证

MIT
