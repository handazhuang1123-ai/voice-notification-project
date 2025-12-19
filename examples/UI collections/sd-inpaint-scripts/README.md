# SD Inpaint 自动化脚本

## 前置条件

1. **启动 SD WebUI 时启用 API**：
   ```bash
   # 在 webui-user.bat 中添加参数
   set COMMANDLINE_ARGS=--api
   ```
   或直接运行：
   ```bash
   python launch.py --api
   ```

2. **确认 API 可用**：浏览器访问 `http://127.0.0.1:7860/docs` 能看到 API 文档

---

## 使用方法

### 1. 准备 Mask 图片

用 Photoshop/GIMP/画图 创建 mask：
- **白色区域** = 要生成新内容的地方（右手出现的位置）
- **黑色区域** = 保持原图不变的地方（左手、设备、背景）

mask 尺寸必须与原图一致。

### 2. 运行脚本

```powershell
cd "H:\HZH\Little-Projects\voice-notification-project\examples\UI collections\sd-inpaint-scripts"

# 基础用法
.\Invoke-SDInpaint.ps1 -ImagePath "..\pipboy.png" -MaskPath ".\mask.png" -Prompt "a right hand with leather glove"

# 调整参数
.\Invoke-SDInpaint.ps1 `
    -ImagePath "..\pipboy.png" `
    -MaskPath ".\mask.png" `
    -Prompt "a right hand naturally extended, same lighting" `
    -DenoisingStrength 0.6 `
    -BatchCount 8 `
    -Steps 40
```

### 3. 查看结果

生成的图片保存在 `output/` 目录，文件名格式：`inpaint_日期_序号.png`

---

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-ImagePath` | 原图路径 | 必填 |
| `-MaskPath` | Mask 路径 | 必填 |
| `-Prompt` | 提示词 | 必填 |
| `-NegativePrompt` | 负面提示词 | bad anatomy... |
| `-DenoisingStrength` | 去噪强度 (0.1-1.0)，越低越保守 | 0.75 |
| `-BatchCount` | 生成数量 | 4 |
| `-Steps` | 采样步数 | 30 |
| `-SDUrl` | WebUI 地址 | http://127.0.0.1:7860 |

---

## 针对你的场景的建议

**提示词示例**：
```
a right hand with leather glove, reaching forward, same lighting as left hand, photorealistic
```

**参数建议**：
- `DenoisingStrength`: 从 0.5 开始，效果不好再提高到 0.7
- `BatchCount`: 8-16 张，多生成几张挑选

**Mask 绘制技巧**：
- mask 边缘稍微模糊一点（羽化 2-4px），融合更自然
- 白色区域比实际需要的稍大一点，给模型留余地
