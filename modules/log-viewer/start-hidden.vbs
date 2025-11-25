' Log Viewer - Hidden Starter
' 后台隐藏窗口启动脚本

Dim objShell, strScriptPath
Dim cmdBackend, cmdFrontend

Set objShell = CreateObject("WScript.Shell")

' 获取脚本所在目录
strScriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 构建启动命令（不重定向日志，保持原始行为）
cmdBackend = "cmd /c ""cd /d """ & strScriptPath & "\backend"" && npm run dev"""
cmdFrontend = "cmd /c ""cd /d """ & strScriptPath & "\frontend"" && pnpm dev"""

' 启动后端服务（隐藏窗口）
objShell.Run cmdBackend, 0, False

' 等待后端启动
WScript.Sleep 2000

' 启动前端服务（隐藏窗口）
objShell.Run cmdFrontend, 0, False

Set objShell = Nothing
