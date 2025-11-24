# Phase 2.1 架构工具脚本

本目录包含 Phase 2.1 架构重构相关的工具脚本。

## 📁 文件说明

### 1. `analyze-architecture.js`
**用途**: 架构分析工具
- 分析数据库表结构混乱问题
- 识别文件依赖关系
- 生成架构问题报告
- 提供重构建议

**使用场景**: 重构前的现状分析

```bash
node scripts/profile/tools/analyze-architecture.js
```

### 2. `refactor-phase21-architecture.js`
**用途**: 自动化架构重构工具
- 创建新的目录结构
- 迁移数据库表到独立数据库
- 移动文件到正确位置
- 更新所有引用路径
- 创建启动脚本和配置文件

**使用场景**: 执行架构重构

```bash
# 预览模式（不实际修改）
node scripts/profile/tools/refactor-phase21-architecture.js --dry-run

# 执行重构
node scripts/profile/tools/refactor-phase21-architecture.js
```

### 3. `verify-refactor.js`
**用途**: 重构验证工具
- 验证目录结构是否正确
- 检查文件是否成功移动
- 确认数据库分离情况
- 测试服务可访问性

**使用场景**: 重构后的验证

```bash
node scripts/profile/tools/verify-refactor.js
```

## ⚠️ 注意事项

这些工具脚本是**一次性使用**的架构重构工具：
- ✅ 已完成其使命（2025-11-24）
- ✅ 保留在此作为架构重构的历史记录
- ⚠️ 不应再次运行，除非需要了解重构过程

## 🏗️ 架构重构成果

通过这些工具，成功实现了：

**重构前**:
- 17张表混在 `data/rag-database.db`
- 文件散落在 scripts 根目录
- 模块边界不清

**重构后**:
- Phase 2.1 完全独立模块化
- 独立数据库 `data/profile/profile.db`
- 清晰的目录结构 `scripts/profile/`
- 可整体迁移到其他项目

## 📝 历史意义

这些工具脚本记录了项目从混乱到有序的转变过程，体现了**"保持扩展性和迁移灵活性"**这一架构第一原则的重要性。

---

**创建日期**: 2025-11-24
**作者**: 壮爸