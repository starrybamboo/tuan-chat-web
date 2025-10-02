// TTS API 使用示例

import type { InferRequest } from "./apis";

import { createTTSApi } from "./apis";

// 创建 TTS API 实例
const ttsApi = createTTSApi("http://localhost:9000");

// 使用示例

/**
 * 基础文本转语音示例
 */
export async function basicTTSExample() {
  try {
    // 1. 检查服务健康状态
    const healthCheck = await ttsApi.health();
    console.log("服务状态:", healthCheck);

    // 2. 获取模型信息
    const modelInfo = await ttsApi.modelInfo();
    console.log("模型信息:", modelInfo);

    // 3. 基础推理请求
    const inferRequest: InferRequest = {
      text: "你好，这是一个测试。欢迎使用 IndexTTS2！",
      // 可以使用本地音频文件路径
      prompt_audio_path: "examples/voice_01.wav",
      // 或使用 base64 编码的音频
      // prompt_audio_base64: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
      return_audio_base64: true, // 返回 base64 编码的音频
    };

    const result = await ttsApi.infer(inferRequest);
    console.log("推理结果:", result);

    if (result.data?.audio_base64) {
      // 可以直接播放或下载生成的音频
      console.log("生成的音频 base64 长度:", result.data.audio_base64.length);
    }
  }
  catch (error) {
    console.error("TTS 请求失败:", error);
  }
}

/**
 * 高级情感控制示例
 */
export async function advancedEmotionTTSExample() {
  try {
    // 获取系统配置
    const config = await ttsApi.config();
    console.log("系统配置:", config);

    // 使用情感向量控制
    const emotionVectorRequest: InferRequest = {
      text: "今天真是太开心了！阳光明媚，心情愉悦。",
      prompt_audio_path: "examples/voice_01.wav",
      emo_mode: 2, // 使用情感向量
      emo_vector: [0.8, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0], // 喜悦情感
      temperature: 0.7,
      top_p: 0.9,
      return_audio_base64: true,
    };

    const emotionResult = await ttsApi.infer(emotionVectorRequest);
    console.log("情感控制推理结果:", emotionResult);

    // 使用情感描述文本控制
    const emotionTextRequest: InferRequest = {
      text: "这个消息让我感到非常沮丧和失望。",
      prompt_audio_path: "examples/voice_01.wav",
      emo_mode: 3, // 使用情感描述文本
      emo_text: "悲伤，失落，沮丧",
      temperature: 0.8,
      return_audio_base64: true,
    };

    const textEmotionResult = await ttsApi.infer(emotionTextRequest);
    console.log("文本情感控制结果:", textEmotionResult);
  }
  catch (error) {
    console.error("高级情感控制失败:", error);
  }
}

/**
 * 文本分句示例
 */
export async function segmentTextExample() {
  try {
    const longText = `
      这是一段很长的文本，包含多个句子。
      我们需要将它分割成适合 TTS 处理的片段。
      每个片段不应该太长，以确保生成质量。
      同时也不应该太短，以保持语音的连贯性。
    `;

    const segmentResult = await ttsApi.segment({
      text: longText,
      max_text_tokens_per_segment: 120,
    });

    console.log("分句结果:", segmentResult);

    if (segmentResult.data?.segments) {
      // 为每个片段生成语音
      for (const segment of segmentResult.data.segments) {
        console.log(`处理片段 ${segment.index}: ${segment.content} (${segment.token_count} tokens)`);

        const segmentInferRequest: InferRequest = {
          text: segment.content,
          prompt_audio_path: "examples/voice_01.wav",
          return_audio_base64: false, // 保存为文件
        };

        const segmentResult = await ttsApi.infer(segmentInferRequest);
        console.log(`片段 ${segment.index} 推理完成:`, segmentResult.data?.audio_path);
      }
    }
  }
  catch (error) {
    console.error("文本分句失败:", error);
  }
}

/**
 * 获取示例数据
 */
export async function getExamplesExample() {
  try {
    const examples = await ttsApi.examples();
    console.log("可用示例:", examples);

    if (examples.data?.examples && examples.data.examples.length > 0) {
      // 使用第一个示例进行推理
      const firstExample = examples.data.examples[0];

      const exampleRequest: InferRequest = {
        text: firstExample.text || "这是一个示例文本",
        prompt_audio_path: firstExample.prompt_audio_url,
        return_audio_base64: true,
      };

      const result = await ttsApi.infer(exampleRequest);
      console.log("示例推理结果:", result);
    }
  }
  catch (error) {
    console.error("获取示例失败:", error);
  }
}

/**
 * 调试信息示例
 */
export async function debugInfoExample() {
  try {
    const debugInfo = await ttsApi.debug();
    console.log("系统调试信息:", debugInfo);

    if (debugInfo.data) {
      console.log("模型已加载:", debugInfo.data.model_loaded);
      console.log("CUDA 可用:", debugInfo.data.cuda_available);
      console.log("GPU 数量:", debugInfo.data.gpu_count);

      if (debugInfo.data.gpu_info) {
        debugInfo.data.gpu_info.forEach((gpu, index) => {
          console.log(`GPU ${index}: ${gpu.name} - 内存: ${(gpu.memory_total / 1024 / 1024 / 1024).toFixed(2)}GB`);
        });
      }
    }
  }
  catch (error) {
    console.error("获取调试信息失败:", error);
  }
}

// 工具函数

/**
 * 将 base64 音频转换为可播放的 URL
 */
export function base64ToAudioUrl(base64: string, mimeType: string = "audio/wav"): string {
  const byteCharacters = atob(base64);
  const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * 下载 base64 音频文件
 */
export function downloadBase64Audio(base64: string, filename: string = "generated_audio.wav"): void {
  const url = base64ToAudioUrl(base64);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 播放 base64 音频
 */
export function playBase64Audio(base64: string): HTMLAudioElement {
  const url = base64ToAudioUrl(base64);
  const audio = new Audio(url);
  audio.play();

  // 播放结束后清理 URL
  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(url);
  });

  return audio;
}
