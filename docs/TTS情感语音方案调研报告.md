# TTS 情感语音方案调研报告

> 调研日期: 2025-12-18
> 目的: 为 voice-summary 项目寻找支持情感风格的 TTS 方案
> 排除方案: edge-tts（Python/Node.js 版均已不支持 SSML 情感标签）

---

## 一、执行摘要

### 推荐排名

| 排名 | 方案 | 推荐指数 | 成本 | 部署方式 | 实现难度 |
|------|------|----------|------|----------|----------|
| 1 | **Azure Speech Service** | ⭐⭐⭐⭐⭐ | 免费50万字/月 | 云服务 | 简单 |
| 2 | **ChatTTS** | ⭐⭐⭐⭐ | 完全免费 | 本地 | 中等 |
| 3 | **GPT-SoVITS** | ⭐⭐⭐⭐ | 完全免费 | 本地 | 较难 |
| 4 | **Coqui TTS / XTTS-v2** | ⭐⭐⭐ | 完全免费 | 本地 | 中等 |

### 快速决策

- **追求效果和便利性** → Azure Speech Service
- **完全免费 + 本地部署 + 低硬件要求** → ChatTTS
- **需要声音克隆** → GPT-SoVITS
- **已有 GPU + 多语言需求** → Coqui TTS

---

## 二、方案详解

### 方案一：Azure Speech Service（云服务 - 强烈推荐）

#### 基本信息

- **类型**: 云服务 API
- **厂商**: 微软
- **官网**: https://azure.microsoft.com/zh-cn/products/ai-services/text-to-speech

#### 效果评价

- **音质**: Neural Voice（神经网络）音质接近真人
- **情感支持**: 支持 8 种情感风格
  - Angry（愤怒）
  - Calm（平静）
  - Chat（聊天）
  - Cheerful（愉快）
  - Disgruntled（不满）
  - Fearful（恐惧）
  - Sad（悲伤）
  - Serious（严肃）
- **中文男声**:
  - `zh-CN-YunxiNeural`（云希）- 支持完整情感风格
  - `zh-CN-YunjianNeural`（云健）
  - `zh-CN-YunyangNeural`（云扬）- 情感风格有限
- **角色扮演**: 支持年龄/性别模拟

#### 成本

| 项目 | 说明 |
|------|------|
| 免费额度 | 每月 50 万字符（约 25 小时语音） |
| 新用户福利 | 前 12 个月无限制使用 |
| 超额收费 | 约 $16/百万字符（Neural Voice） |

#### 实现难度: ⭐⭐（简单）

**Node.js 集成示例**:

```javascript
const sdk = require("microsoft-cognitiveservices-speech-sdk");

// 配置
const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    "eastasia"  // 建议选择 East Asia 节点
);

// 设置男声
speechConfig.speechSynthesisVoiceName = "zh-CN-YunxiNeural";

// 使用 SSML 控制情感
const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="zh-CN-YunxiNeural">
        <mstts:express-as style="cheerful" styledegree="2">
            你好壮爸，今天天气不错！
        </mstts:express-as>
    </voice>
</speak>`;

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
synthesizer.speakSsmlAsync(ssml);
```

**PowerShell 集成示例**:

```powershell
# 安装 SDK（如果使用 REST API 则不需要）
# REST API 方式更适合 PowerShell

$subscriptionKey = $env:AZURE_SPEECH_KEY
$region = "eastasia"
$endpoint = "https://$region.tts.speech.microsoft.com/cognitiveservices/v1"

$ssml = @"
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="zh-CN-YunxiNeural">
        <mstts:express-as style="cheerful">
            $text
        </mstts:express-as>
    </voice>
</speak>
"@

$headers = @{
    "Ocp-Apim-Subscription-Key" = $subscriptionKey
    "Content-Type" = "application/ssml+xml"
    "X-Microsoft-OutputFormat" = "audio-16khz-128kbitrate-mono-mp3"
}

Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $ssml -OutFile "output.mp3"
```

#### 优势

- 无需本地部署，调用简单
- 音质和情感表达业界一流
- 免费额度对个人用户足够
- 官方 SDK 支持完善（Node.js、Python、C#）
- 延迟低（East Asia 节点）

#### 劣势

- 需要网络连接
- 需要注册 Azure 账号（绑定信用卡验证，但不自动扣费）

#### 快速开始步骤

1. 注册 Azure 账号: https://azure.microsoft.com/zh-cn/free/
2. 创建 Speech Service 资源（选择 F0 免费层）
3. 获取密钥和区域
4. 安装 SDK: `npm install microsoft-cognitiveservices-speech-sdk`
5. 测试代码

#### 参考链接

- [永久免费语音服务！微软 Azure 注册实操](https://zhuanlan.zhihu.com/p/6530923260)
- [Azure 语音服务定价](https://azure.microsoft.com/zh-cn/pricing/details/cognitive-services/speech-services/)
- [SSML 语音和声音控制](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)
- [Azure TTS 免费教程](https://blog.csdn.net/u010522887/article/details/143731710)
- [语音服务配额和限制](https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/speech-services-quotas-and-limits)

---

### 方案二：ChatTTS（本地部署 - 开源推荐）

#### 基本信息

- **类型**: 本地部署
- **开源协议**: AGPL-3.0
- **GitHub**: https://github.com/2noise/ChatTTS
- **模型大小**: 约 1.1GB

#### 效果评价

- **音质**: 韵律自然，接近真人对话
- **情感支持**: 原生支持细粒度韵律控制
  - `[laugh]` - 笑声
  - `[uv_break]` - 停顿
  - `oral_(0-9)` - 口语化程度
  - `laugh_(0-2)` - 笑声程度
  - `break_(0-7)` - 停顿长度
- **训练规模**: 使用 10 万小时+ 中英文数据训练
- **专为对话场景优化**

#### 成本

- **完全免费**，开源项目
- 无使用限制

#### 硬件要求

| 配置 | 说明 |
|------|------|
| Python | 3.8+ |
| CPU | 普通笔记本即可 |
| GPU | 可选（有 CUDA 支持更快） |
| 内存 | 建议 8GB+ |

#### 实现难度: ⭐⭐⭐（中等）

**安装**:

```bash
pip install ChatTTS
```

**Python 使用示例**:

```python
import ChatTTS
import torch
import torchaudio

# 初始化
chat = ChatTTS.Chat()
chat.load_models()

# 基础使用
text = "你好壮爸，今天天气不错"
wavs = chat.infer([text])

# 保存音频
torchaudio.save("output.wav", torch.from_numpy(wavs[0]), 24000)

# 带情感控制
text_with_emotion = "你好壮爸[laugh]，今天天气不错[uv_break]"
wavs = chat.infer([text_with_emotion])
```

**情感控制标记**:

| 标记 | 效果 |
|------|------|
| `[laugh]` | 插入笑声 |
| `[uv_break]` | 短停顿 |
| `[oral_0]` ~ `[oral_9]` | 口语化程度（0最正式，9最口语） |
| `[laugh_0]` ~ `[laugh_2]` | 笑声程度 |
| `[break_0]` ~ `[break_7]` | 停顿长度 |

#### 优势

- 完全免费，无使用限制
- 本地部署，数据私密
- 情感控制细粒度高
- 专为对话场景优化
- 硬件要求低（CPU 可运行）

#### 劣势

- 需要本地部署环境
- 首次加载模型较慢（约 30 秒）
- 情感控制需要学习标记语法
- 不如 Azure 的情感风格直观

#### 参考链接

- [ChatTTS GitHub](https://github.com/2noise/ChatTTS)
- [开源免费 AI 朗读中文，居然也能以假乱真了？](https://sspai.com/post/89264)
- [ChatTTS WebUI 界面版](https://github.com/jianchang512/ChatTTS-ui)

---

### 方案三：GPT-SoVITS（本地部署 - 声音克隆）

#### 基本信息

- **类型**: 本地部署
- **特色**: 声音克隆 + 情感迁移
- **GitHub**: https://github.com/RVC-Boss/GPT-SoVITS

#### 效果评价

- **音质**: 高质量语音克隆
- **情感支持**: 通过参考音频传递情感风格
- **Few-shot 学习**: 仅需 6 秒音频即可克隆声音
- **跨语言支持**: 支持中英日多语言

#### 成本

- **完全免费**，开源项目

#### 硬件要求

| 配置 | 要求 |
|------|------|
| Python | 3.9+ |
| GPU | **必需** - NVIDIA 4GB+ VRAM |
| CUDA | 支持 |
| 内存 | 建议 16GB+ |

#### 实现难度: ⭐⭐⭐⭐（较难）

**部署流程**:

```bash
git clone https://github.com/RVC-Boss/GPT-SoVITS.git
cd GPT-SoVITS
pip install -r requirements.txt
python webui.py
```

**使用流程**:

1. 准备参考音频（6秒以上）
2. 在 WebUI 中上传参考音频
3. 输入要合成的文本
4. 生成语音

#### 优势

- 可以克隆任意声音（包括自己的声音）
- 情感表达通过参考音频实现，更灵活
- 支持多语言混合
- 社区活跃，预训练模型丰富

#### 劣势

- 部署复杂
- **必须有 NVIDIA GPU**
- 需要准备参考音频
- 学习曲线较陡

#### 参考链接

- [GPT-SoVITS GitHub](https://github.com/RVC-Boss/GPT-SoVITS)

---

### 方案四：Coqui TTS / XTTS-v2（本地部署）

#### 基本信息

- **类型**: 本地部署
- **GitHub**: https://github.com/coqui-ai/TTS
- **Hugging Face**: https://huggingface.co/coqui/XTTS-v2
- **注意**: Coqui 公司已于 2023 年底关闭，但开源代码仍可用

#### 效果评价

- **音质**: XTTS-v2 支持 17 种语言包括中文
- **情感支持**: 通过参考音频传递情感和风格
- **采样率**: 24kHz
- **声音克隆**: 支持

#### 成本

- **完全免费**

#### 硬件要求

| 配置 | 要求 |
|------|------|
| GPU | 推荐（CPU 较慢） |
| 内存 | 建议 16GB+ |

#### 实现难度: ⭐⭐⭐（中等）

**安装**:

```bash
pip install TTS
```

**Python 示例**:

```python
from TTS.api import TTS

# 列出可用模型
print(TTS.list_models())

# 使用中文模型
tts = TTS(model_name="tts_models/zh-CN/baker/tacotron2-DDC-GST")
tts.tts_to_file(text="你好壮爸", file_path="output.wav")

# 使用 XTTS-v2（支持声音克隆）
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
tts.tts_to_file(
    text="你好壮爸",
    file_path="output.wav",
    speaker_wav="reference.wav",  # 参考音频
    language="zh-cn"
)
```

#### 优势

- 支持多语言
- 声音克隆能力
- 情感风格迁移
- 开源社区维护

#### 劣势

- 公司已关闭，官方维护停止
- 中文支持不如专门的中文模型
- GPU 需求较高

#### 参考链接

- [Coqui TTS GitHub](https://github.com/coqui-ai/TTS)
- [XTTS-v2 Hugging Face](https://huggingface.co/coqui/XTTS-v2)
- [开源语音合成库 coqui TTS 使用记录](https://www.cnblogs.com/inchbyinch/p/18335636)

---

## 三、其他云服务对比

### 国内云服务

| 服务商 | 情感支持 | 中文男声 | 免费额度 | 备注 |
|--------|----------|----------|----------|------|
| 阿里云 | 有限 | 支持 | 有试用 | 按调用次数计费 |
| 腾讯云 | 支持 | 支持 | 新用户有 | 按字符数计费 |
| 百度云 | 基础 | 支持 | 有试用 | PaddleSpeech 可本地部署 |

### 国际云服务

| 服务商 | 情感支持 | 中文支持 | 成本 | 备注 |
|--------|----------|----------|------|------|
| Google Cloud TTS | 有限 | 普通话/粤语 | ~$16/百万字符 | 情感不如 Azure |
| Amazon Polly | 有限 | 普通话 | ~$16/百万字符 | 中文情感弱 |

---

## 四、本地方案硬件要求对比

| 方案 | CPU 运行 | GPU 要求 | 内存 | 首次加载时间 |
|------|----------|----------|------|--------------|
| ChatTTS | ✅ 可以 | 可选 | 8GB+ | ~30秒 |
| GPT-SoVITS | ❌ 不可 | 必需 4GB+ | 16GB+ | ~60秒 |
| Coqui TTS | ⚠️ 很慢 | 推荐 | 16GB+ | ~30秒 |
| PaddleSpeech | ✅ 可以 | 可选 | 8GB+ | ~20秒 |

---

## 五、为 voice-summary 项目的建议

### 当前状态

- 使用 Node.js 版 edge-tts
- 情感风格检测已实现，但无法生效
- SSML 参数（Rate、Pitch、Volume）改变了原有语音效果

### 推荐方案

#### 方案 A: Azure Speech Service（推荐）

**优势**:
- 与现有 Node.js 环境兼容
- 免费额度完全够用（hook 触发频率不高）
- 集成简单，效果好
- `zh-CN-YunxiNeural` 男声支持完整情感

**实施步骤**:
1. 注册 Azure 账号
2. 创建 Speech Service（F0 免费层）
3. 修改 `Play-EdgeTTS.ps1` 调用 Azure API
4. 现有情感检测逻辑可直接复用

#### 方案 B: ChatTTS 本地部署

**优势**:
- 完全免费，无网络依赖
- 硬件要求低

**实施步骤**:
1. `pip install ChatTTS`
2. 创建 Python 脚本包装
3. PowerShell 调用 Python 脚本
4. 修改情感标记映射

#### 方案 C: 恢复纯文本模式（临时方案）

**如果暂时不想更换 TTS 引擎**:
1. 修改 `voice-config.json`:
   ```json
   {
       "UseSSML": false,
       "EmotionSettings": {
           "UseAutoDetection": false
       }
   }
   ```
2. 恢复到迁移前的语音效果

---

## 六、附录

### edge-tts 为何被排除

| 版本 | SSML 支持 | 情感风格 |
|------|-----------|----------|
| Python edge-tts < 5.0 | ✅ 支持 | ✅ 支持 |
| Python edge-tts >= 5.0 | ❌ 已移除 | ❌ 不支持 |
| Node.js @andresaya/edge-tts | ❌ 不支持 mstts 标签 | ❌ 不支持 |

> **原因**: 微软主动阻止了 edge-tts 的自定义 SSML 功能，从 5.0.0 版本起已移除支持。

### 参考资源

- [edge-tts PyPI](https://pypi.org/project/edge-tts/) - 说明 SSML 已移除
- [Azure Speech 官方文档](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [ChatTTS 少数派介绍](https://sspai.com/post/89264)

---

**文档维护者**: 壮爸
**最后更新**: 2025-12-18
