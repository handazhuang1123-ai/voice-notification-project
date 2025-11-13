# 手动安装 SQLite 依赖指南

## 📋 需要下载的文件

### 方案A：System.Data.SQLite（推荐用于 PowerShell）

#### 1. System.Data.SQLite.dll

**下载地址**：
```
https://system.data.sqlite.org/index.html/doc/trunk/www/downloads.wiki
```

**具体步骤**：
1. 访问 https://system.data.sqlite.org/downloads/1.0.119.0/sqlite-netFx46-binary-x64-2015-1.0.119.0.zip
2. 下载 `sqlite-netFx46-binary-x64-2015-1.0.119.0.zip`
3. 解压后找到以下文件：
   - `System.Data.SQLite.dll` → 复制到 `H:\HZH\Little-Projects\voice-notification-project\lib\`
   - `System.Data.SQLite.Linq.dll` → 复制到 `H:\HZH\Little-Projects\voice-notification-project\lib\`
   - `x64\SQLite.Interop.dll` → 复制到 `H:\HZH\Little-Projects\voice-notification-project\lib\x64\SQLite.Interop.dll`

**文件大小参考**：
- System.Data.SQLite.dll ≈ 400 KB
- SQLite.Interop.dll ≈ 1.5 MB

---

#### 2. sqlite-vec 扩展（向量搜索）

**下载地址**：
```
https://github.com/asg017/sqlite-vec/releases
```

**具体步骤**：
1. 访问 https://github.com/asg017/sqlite-vec/releases/latest
2. 找到 **Assets** 部分
3. 下载 `sqlite-vec-v0.1.x-loadable-windows-x86_64.zip`（选择最新版本）
4. 解压后找到 `vec0.dll`
5. 复制 `vec0.dll` 到 `H:\HZH\Little-Projects\voice-notification-project\lib\vec0.dll`

**文件大小参考**：
- vec0.dll ≈ 200-300 KB

---

### 方案B：Microsoft.Data.Sqlite（现代化方案）

如果方案A下载困难，可以使用这个方案：

#### 1. 下载 NuGet 包

**手动下载链接**：
```
Microsoft.Data.Sqlite.Core:
https://www.nuget.org/api/v2/package/Microsoft.Data.Sqlite.Core/9.0.0

SQLitePCLRaw.core:
https://www.nuget.org/api/v2/package/SQLitePCLRaw.core/2.1.10

SQLitePCLRaw.bundle_e_sqlite3:
https://www.nuget.org/api/v2/package/SQLitePCLRaw.bundle_e_sqlite3/2.1.10

SQLitePCLRaw.provider.e_sqlite3:
https://www.nuget.org/api/v2/package/SQLitePCLRaw.provider.e_sqlite3/2.1.10
```

#### 2. 解压和提取 DLL

**操作步骤**：
1. 下载上述 `.nupkg` 文件（本质是 ZIP 格式）
2. 将 `.nupkg` 重命名为 `.zip`
3. 解压每个文件，找到并复制以下 DLL：

**从 Microsoft.Data.Sqlite.Core.9.0.0.nupkg**：
- `lib\net8.0\Microsoft.Data.Sqlite.dll` → 复制到 `lib\`

**从 SQLitePCLRaw.core.2.1.10.nupkg**：
- `lib\netstandard2.0\SQLitePCLRaw.core.dll` → 复制到 `lib\`

**从 SQLitePCLRaw.bundle_e_sqlite3.2.1.10.nupkg**：
- `lib\netstandard2.0\SQLitePCLRaw.bundle_e_sqlite3.dll` → 复制到 `lib\`

**从 SQLitePCLRaw.provider.e_sqlite3.2.1.10.nupkg**：
- `runtimes\win-x64\native\e_sqlite3.dll` → 复制到 `lib\`

---

## 📂 最终目录结构

安装完成后，`lib\` 目录应该包含：

### 方案A 结构：
```
H:\HZH\Little-Projects\voice-notification-project\lib\
├── System.Data.SQLite.dll          (必需)
├── System.Data.SQLite.Linq.dll     (可选)
├── vec0.dll                         (可选，用于向量搜索)
└── x64\
    └── SQLite.Interop.dll          (必需)
```

### 方案B 结构：
```
H:\HZH\Little-Projects\voice-notification-project\lib\
├── Microsoft.Data.Sqlite.dll
├── SQLitePCLRaw.core.dll
├── SQLitePCLRaw.bundle_e_sqlite3.dll
├── e_sqlite3.dll
└── vec0.dll                         (可选，用于向量搜索)
```

---

## ✅ 验证安装

安装完成后，运行以下命令验证：

```powershell
# 测试加载 DLL
cd H:\HZH\Little-Projects\voice-notification-project

# 方案A 验证
Add-Type -Path ".\lib\System.Data.SQLite.dll"
Write-Host "✓ System.Data.SQLite loaded successfully" -ForegroundColor Green

# 方案B 验证
Add-Type -Path ".\lib\Microsoft.Data.Sqlite.dll"
Write-Host "✓ Microsoft.Data.Sqlite loaded successfully" -ForegroundColor Green
```

---

## 🚀 下一步

依赖安装完成后，告诉我你选择了哪个方案（A或B），我会继续创建对应的 VectorMemory 模块。

**推荐**：方案A（System.Data.SQLite）更适合 PowerShell 环境。
