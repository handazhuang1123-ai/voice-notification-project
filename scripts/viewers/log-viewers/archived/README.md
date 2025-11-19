# 已归档的 PowerShell 脚本

**归档日期**: 2025-01-20
**原因**: 迁移到 Node.js/TypeScript 实现

---

## 归档文件说明

这些文件是之前基于 PowerShell HttpListener 的实现，已被 Node.js/TypeScript 版本替代。

### 主要脚本（已废弃）

1. **`Open-LogViewer.ps1`** - 旧的 PowerShell HTTP 服务器
   - 问题：单线程阻塞
   - 已替代为：`../node-server/src/server.ts`

2. **`Export-LogsData.ps1`** - 旧的日志导出脚本
   - 已替代为：`../node-server/src/export-logs.ts`

### 临时修复脚本（已废弃）

这些脚本是为了修复 PowerShell 单线程阻塞问题的临时方案：

3. **`Apply-Blocking-Fix.ps1`** - 客户端断开检测修复
4. **`Apply-Timeout-Fix.ps1`** - 超时时间调整修复
5. **`Test-PodeServer.ps1`** - Pode 框架测试（未采用）

### 备份文件

6. **`Open-LogViewer.ps1.backup-before-node-migration`** - 迁移前的最终版本
7. **`Export-LogsData.ps1.backup-before-node-migration`** - 迁移前的最终版本
8. **`Open-LogViewer.ps1.backup`** - 早期备份
9. **`Open-LogViewer.ps1.backup-blocking-fix`** - 应用阻塞修复后的备份

---

## 为什么归档？

PowerShell HttpListener 的根本问题：
- **单线程阻塞** - FileSystemWatcher 事件处理会阻塞所有 HTTP 请求
- **并发性能差** - 多个浏览器标签会导致超时
- **维护困难** - 异步模型复杂且不可靠

Node.js 的解决方案：
- ✅ **异步非阻塞** - 事件驱动架构
- ✅ **高并发** - 轻松处理多个请求
- ✅ **TypeScript 类型安全** - 更好的代码质量
- ✅ **性能优异** - 响应快速

---

## 如何恢复？

如需回退到 PowerShell 版本：

```powershell
# 1. 复制文件回上级目录
Copy-Item archived/Open-LogViewer.ps1 ../
Copy-Item archived/Export-LogsData.ps1 ../

# 2. 运行 PowerShell 版本
..\Open-LogViewer.ps1
```

**注意**: PowerShell 版本仍然存在单线程阻塞问题，不推荐使用。

---

## 相关文档

- [Node.js 迁移完成报告](../../../../docs/Node.js迁移完成报告.md)
- [PowerShell 单线程阻塞问题调研报告](../../../../docs/PowerShell-HttpListener单线程阻塞问题解决方案调研报告.md)
- [Node.js 服务器文档](../node-server/README.md)

---

**维护者**: 壮爸
**归档版本**: PowerShell v4.0 → Node.js v1.0.0
