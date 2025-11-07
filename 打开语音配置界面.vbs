Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPSScript = strScriptPath & "\.claude\hooks\Show-VoiceConfigUI.ps1"

' 静默运行 PowerShell，不显示窗口
objShell.Run "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -File """ & strPSScript & """", 0, False
