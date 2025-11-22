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
  refAudioPath: string; // 服务端可访问路径(必填)
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
    if (!opts.refAudioPath) {
      throw new Error("GptSovitsEngine 需要 refAudioPath");
    }
  }

  async generate(text: string, _refVocalFile: File): Promise<TtsGenerateResult> {
    // _refVocalFile 暂不直接上传给后端; 仅用于生成唯一文件名的参考。实际模型使用 refAudioPath。
    const {
      apiUrl = "http://127.0.0.1:9880",
      refAudioPath,
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
    } = this.opts;

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
