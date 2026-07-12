# TTS 引擎集成

本目录提供了统一的 TTS (Text-to-Speech) 引擎抽象和多后端支持。

## 当前实时渲染接入：VoiceBox

WebGAL 实时渲染的 AI 配音通过 VoiceBox REST API 调用 Qwen CustomVoice 0.6B：

- 默认服务地址：`http://127.0.0.1:17493`
- 模型：`Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`
- Profile：团剧共创会按选中的预设音色自动查询或创建
- 生成流程：`POST /generate` → `GET /history/{id}` → `GET /audio/{id}`
- 配置位置：空间 WebGAL 实时渲染设置的“TTS 配音层”

VoiceBox 源码位于 `D:\A_collection\voicebox`。仅运行 REST 后端时使用：

```powershell
cd D:\A_collection\voicebox
just setup
just dev-backend
```

部署域名调用本机 VoiceBox 时，在启动后端前追加允许的来源：

```powershell
$env:VOICEBOX_CORS_ORIGINS="https://你的团剧共创域名"
just dev-backend
```

多个来源使用英文逗号分隔。VoiceBox 默认允许本地 Vite、VoiceBox 自身和 Tauri 来源。首次生成会下载 Qwen CustomVoice 0.6B 模型，生成任务会在 VoiceBox 中持续运行并由团剧共创轮询结果。

## 目录结构

```
app/tts/
├── engines/                    # 后端引擎实现
│   ├── voicebox/              # VoiceBox REST API 客户端
│   │   ├── api.ts             # Qwen CustomVoice 0.6B 生成流程
│   │   └── api.test.ts        # REST 契约与恢复逻辑测试
│   ├── index/                 # IndexTTS2 引擎
│   │   ├── apiClient.ts       # IndexTTS2 API 客户端
│   │   └── examples.ts        # 使用示例和工具函数
│   └── gptSovits/            # GPT-SoVITS 引擎
│       ├── api.ts            # GPT-SoVITS API 工具函数
│       └── types.ts          # GPT-SoVITS 类型定义
├── strategy/                  # 策略模式抽象层
│   └── ttsEngines.ts         # 统一的引擎接口与实现
└── README.md                  # 本文档
```

## 功能特点

### IndexTTS2 引擎

- 🎭 **情感控制**: 支持 4 种情感模式 (音色参考、情感参考、情感向量、情感文本)
- 🎵 **高质量合成**: 基于先进的声学模型
- 📊 **8 维情感向量**: 喜、怒、哀、惧、厌恶、低落、惊喜、平静
- 🔧 **丰富参数**: temperature、top_p、top_k、beam search 等

### GPT-SoVITS 引擎

- 🌐 **多语言支持**: 中文、英文、日文、粤语、韩文及混合语言
- ✂️ **智能分句**: 6 种文本切分方式
- ⚡ **高性能**: 支持批处理、并行推理、流式输出
- 🎚️ **参数丰富**: 语速、温度、重复惩罚等精细控制
- 🎵 **支持上传音频**: 自动将用户上传的音频文件转换为服务器端路径 ✨新功能

## 快速开始

### 使用策略模式 (推荐)

```typescript
import { createEngine } from "@/tts/strategy/ttsEngines";

// 使用 IndexTTS 引擎
const indexEngine = createEngine({
  engine: "index",
  emotionMode: 2,
  emotionVector: [0.8, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0], // 喜悦情感
  temperature: 0.8,
});

// 使用 GPT-SoVITS 引擎 (自动上传音频)
const gptEngine = createEngine({
  engine: "gpt-sovits",
  textLang: "all_zh",
  temperature: 1.0,
  gameName: "my-game", // 提供游戏名称以便自动上传音频
});

// 或者使用服务器端路径
const gptEngineWithPath = createEngine({
  engine: "gpt-sovits",
  refAudioPath: "/path/to/reference.wav", // 服务器端路径(优先使用)
  textLang: "all_zh",
  temperature: 1.0,
});

// 生成语音 (统一接口)
const result = await gptEngine.generate("你好世界", refVocalFile);
console.log(result.audioBase64); // 生成的 base64 音频
```

### 直接使用 IndexTTS API

```typescript
import { ttsApi } from "@/tts/engines/index/apiClient";
import type { InferRequest } from "@/tts/engines/index/apiClient";

// 基础推理
const request: InferRequest = {
  text: "你好,这是一个测试。",
  prompt_audio_base64: refAudioBase64,
  emo_mode: 2, // 情感向量模式
  emo_vector: [0.8, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0],
  return_audio_base64: true,
};

const result = await ttsApi.infer(request);
```

### 直接使用 GPT-SoVITS API

```typescript
import { generateTTS } from "@/tts/engines/gptSovits/api";
import type { TTSParams } from "@/tts/engines/gptSovits/types";

const params: TTSParams = {
  text: "你好世界",
  text_lang: "all_zh",
  ref_audio_path: "/path/to/reference.wav",
  prompt_text: "参考音频的文字内容",
  prompt_lang: "all_zh",
};

const audioBlob = await generateTTS("http://127.0.0.1:9880", params);
```

## IndexTTS2 详细说明

### API 接口

- `health()` - 健康检查
- `debug()` - 获取调试信息
- `modelInfo()` - 获取模型信息
- `infer(request)` - 文本转语音推理
- `segment(request)` - 文本分句
- `examples()` - 获取示例数据
- `config()` - 获取系统配置

### 情感控制模式

| ģʽ | 说明 |
|------|------|
| 0 | 与音色参考音频相同的情感 |
| 1 | 使用情感参考音频 |
| 2 | 使用情感向量控制 |
| 3 | 使用情感描述文本控制 |

### 情感向量维度

8 维向量对应以下情感:
- `[0]` 喜 (joy)
- `[1]` 怒 (anger)
- `[2]` 哀 (sadness)
- `[3]` 惧 (fear)
- `[4]` 厌恶 (disgust)
- `[5]` 低落 (low)
- `[6]` 惊喜 (surprise)
- `[7]` 平静 (calm)

### 默认参数

```typescript
{
  temperature: 0.8,        // 随机性控制
  top_p: 0.8,             // nucleus sampling
  top_k: 30,              // top-k sampling
  num_beams: 3,           // beam search 数量
  repetition_penalty: 10.0 // 重复惩罚
}
```

### 限制

- 情感向量和不能超过 1.5
- 情感权重最大值 1.6
- 最大文本 tokens 通常为 400
- 最大 Mel tokens 通常为 1500

### 工具函数

```typescript
import {
  base64ToAudioUrl,
  downloadBase64Audio,
  playBase64Audio,
} from "@/tts/engines/index/examples";

// 将 base64 转换为音频 URL
const audioUrl = base64ToAudioUrl(audioBase64);

// 下载音频文件
downloadBase64Audio(audioBase64, "my_audio.wav");

// 直接播放音频
const audio = playBase64Audio(audioBase64);
```

## GPT-SoVITS 详细说明

### 启动后端服务

```bash
# 使用 GPT-SoVITS-Api-GUI (推荐)
cd GPT-SoVITS-Api-GUI
python gsv_api_gui.py

# 或直接运行 GPT-SoVITS API (参考官方文档)
```

### API 接口

- `checkAPIStatus(apiUrl)` - 检查 API 可用性
- `generateTTS(apiUrl, params)` - 生成语音
- `switchGPTModel(apiUrl, weightsPath)` - 切换 GPT 模型
- `switchSoVITSModel(apiUrl, weightsPath)` - 切换 SoVITS 模型
- `saveConfig(key, value)` - 保存配置到 localStorage
- `loadConfig(key, defaultValue)` - 从 localStorage 读取配置

### 参数说明

#### 基础参数

| 参数 | 说明 | 类型 |
|------|------|------|
| text | 要转换的文本 | string |
| text_lang | 文本语言 | string |
| ref_audio_path | 参考音频路径 | string |
| prompt_text | 提示文本 | string |
| prompt_lang | 提示文本语言 | string |

#### 高级参数

| 参数 | 说明 | 默认值 | 范围 |
|------|------|--------|------|
| top_k | 采样候选词数量 | 5 | 1-100 |
| top_p | 核采样概率阈值 | 1.0 | 0-1 |
| temperature | 生成随机性 | 1.0 | 0-2 |
| speed_factor | 语速因子 | 1.0 | 0.5-2.0 |
| repetition_penalty | 重复惩罚 | 1.35 | 1.0-2.0 |
| seed | 随机种子 | -1 | -1 或正整数 |

### 支持的语言

```typescript
const LANGUAGES = {
  all_zh: "中文",
  en: "英文",
  all_ja: "日文",
  all_yue: "粤语",
  all_ko: "韩文",
  zh: "中英混合",
  ja: "日英混合",
  yue: "粤英混合",
  ko: "韩英混合",
  auto: "多语种混合",
  auto_yue: "多语种混合(粤)",
};
```

### 文本切分方法

```typescript
const SPLIT_METHODS = {
  cut0: "不切",
  cut1: "凑四句一切",
  cut2: "凑50字一切",
  cut3: "按中文句号。切",
  cut4: "按英文句号.切",
  cut5: "按标点符号切",
};
```

## 策略模式架构

### 接口定义

```typescript
export type TtsEngine = {
  generate: (text: string, refVocalFile: File) => Promise<TtsGenerateResult>;
};

export type TtsGenerateResult = {
  audioBase64: string;
};
```

### 统一配置

```typescript
export type UnifiedEngineOptions =
  | ({ engine: "index" } & IndexTTSOptions)
  | ({ engine: "gpt-sovits" } & GptSovitsOptions);
```

### 工厂函数

```typescript
export function createEngine(options: UnifiedEngineOptions): TtsEngine;
```

## 使用示例

### WebGAL 场景编辑器集成

```typescript
import { createEngine } from "@/tts/strategy/ttsEngines";

// 在 SceneEditor 中使用
async function generateVocal(text: string, refVocalFile: File) {
  const engine = createEngine({
    engine: "index", // 或 "gpt-sovits"
    emotionMode: 2,
    emotionVector: [0.8, 0.1, 0, 0, 0, 0, 0.1, 0],
  });

  const result = await engine.generate(text, refVocalFile);
  return result.audioBase64;
}
```

### 长文本处理

```typescript
// 使用 IndexTTS 分句
const segmentResult = await ttsApi.segment({
  text: longText,
  max_text_tokens_per_segment: 120,
});

// 为每个片段生成语音
for (const segment of segmentResult.data.segments) {
  const result = await engine.generate(segment.content, refVocalFile);
  // 处理结果...
}
```

## 错误处理

```typescript
try {
  const engine = createEngine(options);
  const result = await engine.generate(text, refVocalFile);
  // 处理成功结果
}
catch (error) {
  console.error("TTS 生成失败:", error);
  // 处理错误
}
```

## 注意事项

### IndexTTS2

1. 确保后端服务正在运行 (默认端口 9000)
2. 音频文件需要是 PCM/WAV 格式
3. base64 音频数据可能很大,注意内存使用
4. 长文本建议先使用 `segment()` 接口分句处理
5. 生成质量受音色参考音频质量影响

### GPT-SoVITS

1. ✨ **支持两种音频输入方式**:
   - **自动上传模式** (推荐): 提供 `gameName` 参数,引擎会自动将 `File` 对象上传到服务器的临时目录
   - **服务器路径模式**: 直接提供 `refAudioPath`,引擎会使用该服务器端路径
2. 首次使用需要确保模型已正确加载
3. API URL 配置会保存在 localStorage 中
4. 生成较长文本时可能需要较长等待时间
5. 默认端口为 9880

#### 自动上传音频示例

```typescript
// 用户上传的音频文件会自动上传到: games/{gameName}/game/vocal/ref/
const engine = createEngine({
  engine: "gpt-sovits",
  gameName: "preview_123", // 必需: 用于构建上传路径
  textLang: "all_zh",
});

// File 对象会自动上传,无需手动处理
const result = await engine.generate("你好世界", userUploadedFile);
```

#### 音频上传路径

- 上传目标: `games/{gameName}/game/vocal/ref/{filename}`
- GPT-SoVITS 服务器需要能够访问 WebGAL 的文件系统
- 如果两个服务在不同机器上,需要配置共享存储或使用 NFS

## 环境变量

```bash
# IndexTTS2 API URL (可选,默认 http://localhost:9000)
VITE_TTS_URL=http://localhost:9000
```

## 相关链接

- [IndexTTS2 官方仓库](https://github.com/your-repo/IndexTTS2)
- [GPT-SoVITS 官方仓库](https://github.com/RVC-Boss/GPT-SoVITS)
- [GPT-SoVITS-Api-GUI](../../GPT-SoVITS-Api-GUI)

## 技术实现

### 策略模式优势

- 解耦不同后端的实现细节
- 统一的接口便于切换引擎
- 易于扩展新的 TTS 后端
- 类型安全的配置选项

### 参考实现

- Python GUI 版本: `APICheckThread`, `TTSThread`, `ConfigManager`
- 使用 React Hooks 替代 PyQt5 信号槽机制
- 使用 localStorage 替代本地 JSON 配置文件
- 使用 Blob URL 进行音频播放
- 使用 TailwindCSS + DaisyUI 实现界面样式
