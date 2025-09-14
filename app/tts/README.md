# TTS API 客户端

这个目录包含了与 IndexTTS2 后端服务通信的前端 API 客户端代码。

## 文件说明

- `apis.ts` - 主要的 API 接口定义和客户端类
- `examples.ts` - 使用示例和工具函数
- `README.md` - 本说明文件

## 快速开始

### 1. 创建 API 实例

```typescript
import { createTTSApi } from './apis';

// 创建 TTS API 实例（默认连接到 localhost:9000）
const ttsApi = createTTSApi('http://localhost:9000');
```

### 2. 基础文本转语音

```typescript
import type { InferRequest } from './apis';

const request: InferRequest = {
  text: "你好，这是一个测试。",
  prompt_audio_path: "examples/voice_01.wav", // 音色参考音频
  return_audio_base64: true, // 返回 base64 编码的音频
};

const result = await ttsApi.infer(request);
console.log('生成结果:', result);
```

### 3. 情感控制

```typescript
// 使用情感向量
const emotionRequest: InferRequest = {
  text: "今天真是太开心了！",
  prompt_audio_path: "examples/voice_01.wav",
  emo_mode: 2, // 情感向量模式
  emo_vector: [0.8, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0], // 喜悦情感
  return_audio_base64: true,
};

// 使用情感描述文本
const textEmotionRequest: InferRequest = {
  text: "这让我感到很难过。",
  prompt_audio_path: "examples/voice_01.wav",
  emo_mode: 3, // 情感文本模式
  emo_text: "悲伤，失落，沮丧",
  return_audio_base64: true,
};
```

## API 接口

### 主要接口

- `health()` - 健康检查
- `debug()` - 获取调试信息  
- `modelInfo()` - 获取模型信息
- `infer(request)` - 文本转语音推理
- `segment(request)` - 文本分句
- `examples()` - 获取示例数据
- `config()` - 获取系统配置

### 情感控制模式

- `0` - 与音色参考音频相同的情感
- `1` - 使用情感参考音频
- `2` - 使用情感向量控制
- `3` - 使用情感描述文本控制

### 情感向量

8 维向量，对应以下情感：
- `[0]` 喜 (joy)
- `[1]` 怒 (anger)  
- `[2]` 哀 (sadness)
- `[3]` 惧 (fear)
- `[4]` 厌恶 (disgust)
- `[5]` 低落 (low)
- `[6]` 惊喜 (surprise)
- `[7]` 平静 (calm)

## 工具函数

### 音频处理

```typescript
import { base64ToAudioUrl, downloadBase64Audio, playBase64Audio } from './examples';

// 将 base64 转换为音频 URL
const audioUrl = base64ToAudioUrl(audioBase64);

// 下载音频文件
downloadBase64Audio(audioBase64, 'my_audio.wav');

// 直接播放音频
const audio = playBase64Audio(audioBase64);
```

## 配置说明

### 默认参数

- `temperature: 0.8` - 控制生成的随机性
- `top_p: 0.8` - nucleus sampling 参数
- `top_k: 30` - top-k sampling 参数
- `num_beams: 3` - beam search 数量
- `repetition_penalty: 10.0` - 重复惩罚

### 限制

- 情感向量和不能超过 1.5
- 情感权重最大值 1.6
- 最大文本 tokens 通常为 400
- 最大 Mel tokens 通常为 1500

## 错误处理

```typescript
try {
  const result = await ttsApi.infer(request);
  // 处理成功结果
} catch (error) {
  console.error('TTS 请求失败:', error);
  // 处理错误
}
```

## 注意事项

1. 确保后端服务正在运行（默认端口 9000）
2. 音频文件路径需要是服务器可访问的路径
3. base64 音频数据可能很大，注意内存使用
4. 长文本建议先使用 `segment()` 接口分句处理
5. 生成质量受音色参考音频质量影响

## 完整示例

查看 `examples.ts` 文件获取完整的使用示例，包括：

- 基础 TTS 推理
- 高级情感控制
- 文本分句处理
- 系统信息获取
- 音频播放和下载