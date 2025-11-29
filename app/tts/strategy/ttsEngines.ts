// 统一的 TTS 引擎策略接口与具体实现
// 目的: 将不同后端(IndexTTS / GPT-SoVITS)的请求与参数映射解耦出 SceneEditor

import type { InferRequest } from "@/tts/engines/index/apiClient";

import { generateTTS } from "@/tts/engines/gptSovits/api";
import { DEFAULT_TTS_PARAMS } from "@/tts/engines/gptSovits/types";
import { ttsApi } from "@/tts/engines/index/apiClient";

export type IndexTTSOptions = {
  emotionMode?: number;
  emotionWeight?: number;
  emotionText?: string;
  emotionVector?: number[];
  temperature?: number;
  topP?: number;
  maxTokensPerSegment?: number;
};

export type GptSovitsOptions = {
  apiUrl?: string; // 默认 http://127.0.0.1:9880
  refAudioPath?: string; // 服务端可访问路径(如果提供,优先使用;否则上传 refVocalFile)
  promptText?: string;
  promptLang?: string;
  textLang?: string;
  topK?: number;
  topP?: number;
  temperature?: number;
  textSplitMethod?: string;
  batchSize?: number;
  speedFactor?: number;
  streamingMode?: boolean;
  seed?: number;
  parallelInfer?: boolean;
  repetitionPenalty?: number;
  uploadToServer?: boolean; // 是否将音频上传到服务器(默认 true)
  gameName?: string; // WebGAL 游戏名称,用于上传路径
};

export type TtsGenerateResult = { audioBase64: string };

export type TtsEngine = {
  generate: (text: string, refVocalFile: File) => Promise<TtsGenerateResult>;
};

// 工具: File -> base64 (无 dataURL 前缀)
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result; // 兼容纯 base64
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export class IndexTtsEngine implements TtsEngine {
  constructor(private opts: IndexTTSOptions = {}) {}

  async generate(text: string, refVocalFile: File): Promise<TtsGenerateResult> {
    const {
      emotionMode = 2,
      emotionWeight = 0.8,
      emotionText,
      emotionVector,
      temperature = 0.8,
      topP = 0.8,
      maxTokensPerSegment = 120,
    } = this.opts;

    const refAudioBase64 = await fileToBase64(refVocalFile);

    const req: InferRequest = {
      text,
      prompt_audio_base64: refAudioBase64,
      emo_mode: emotionMode,
      emo_weight: emotionWeight,
      emo_text: emotionText,
      emo_vector: emotionVector,
      emo_random: false,
      temperature,
      top_p: topP,
      max_text_tokens_per_segment: maxTokensPerSegment,
      return_audio_base64: true,
    };
    const resp = await ttsApi.infer(req);
    if (resp.code !== 0 || !resp.data?.audio_base64) {
      throw new Error(resp.msg || "IndexTTS 生成失败");
    }
    return { audioBase64: resp.data.audio_base64 };
  }
}

export class GptSovitsEngine implements TtsEngine {
  constructor(private opts: GptSovitsOptions) {
    // refAudioPath 可以在 generate 时通过上传文件获得,不再强制要求
  }

  async generate(text: string, refVocalFile: File): Promise<TtsGenerateResult> {
    const {
      apiUrl = "http://127.0.0.1:9880",
      refAudioPath: providedRefAudioPath,
      promptText = "",
      promptLang = DEFAULT_TTS_PARAMS.prompt_lang,
      textLang = DEFAULT_TTS_PARAMS.text_lang,
      topK = DEFAULT_TTS_PARAMS.top_k,
      topP = DEFAULT_TTS_PARAMS.top_p,
      temperature = DEFAULT_TTS_PARAMS.temperature,
      textSplitMethod = DEFAULT_TTS_PARAMS.text_split_method,
      batchSize = DEFAULT_TTS_PARAMS.batch_size,
      speedFactor = DEFAULT_TTS_PARAMS.speed_factor,
      streamingMode = DEFAULT_TTS_PARAMS.streaming_mode,
      seed = DEFAULT_TTS_PARAMS.seed,
      parallelInfer = DEFAULT_TTS_PARAMS.parallel_infer,
      repetitionPenalty = DEFAULT_TTS_PARAMS.repetition_penalty,
      uploadToServer = true,
      gameName,
    } = this.opts;

    // 确定参考音频路径
    let refAudioPath = providedRefAudioPath;

    // 如果没有提供 refAudioPath,则尝试上传文件到服务器
    if (!refAudioPath && uploadToServer && gameName) {
      try {
        // 动态导入 uploadFile 避免循环依赖
        const { uploadFile } = await import("@/webGAL/fileOperator");

        // 将 File 转换为 Blob URL
        const blobUrl = URL.createObjectURL(refVocalFile);

        // 上传到 WebGAL 服务器的临时目录
        const uploadedFileName = await uploadFile(
          blobUrl,
          `games/${gameName}/game/vocal/ref/`,
          refVocalFile.name,
        );

        URL.revokeObjectURL(blobUrl);

        // 构建服务器端可访问的绝对路径
        // 假设 GPT-SoVITS 和 WebGAL 在同一台机器上,或 GPT-SoVITS 可以访问 WebGAL 的文件系统
        refAudioPath = `games/${gameName}/game/vocal/ref/${uploadedFileName}`;

        console.log("✅ 音频文件已上传到服务器:", refAudioPath);
      }
      catch (uploadError) {
        console.error("❌ 上传参考音频失败:", uploadError);
        throw new Error(`无法上传参考音频: ${uploadError}`);
      }
    }

    // 如果仍然没有 refAudioPath,抛出错误
    if (!refAudioPath) {
      throw new Error("GPT-SoVITS 需要 refAudioPath 或提供 gameName 以上传文件");
    }

    const params = {
      text,
      text_lang: textLang,
      ref_audio_path: refAudioPath,
      prompt_text: promptText,
      prompt_lang: promptLang,
      top_k: topK,
      top_p: topP,
      temperature,
      text_split_method: textSplitMethod,
      batch_size: batchSize,
      speed_factor: speedFactor,
      streaming_mode: streamingMode,
      seed,
      parallel_infer: parallelInfer,
      repetition_penalty: repetitionPenalty,
    };

    const blob = await generateTTS(apiUrl, params);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);
    return { audioBase64: base64Audio };
  }
}

export type UnifiedEngineOptions = (
  { engine: "index" } & IndexTTSOptions
) | (
  { engine: "gpt-sovits" } & GptSovitsOptions
);

export function createEngine(options: UnifiedEngineOptions): TtsEngine {
  if (options.engine === "index")
    return new IndexTtsEngine(options);
  return new GptSovitsEngine(options);
}
