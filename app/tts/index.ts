import { HttpClient, TTSApi } from "./apis";

export {
  HttpClient,
  TTSApi,
};

export type {
  GenerationParams,
  HealthResponse,
  SegmentItem,
  SegmentsRequest,
  SegmentsResponse,
  TTSJobStatus,
  TTSRequest,
  TTSResponse,
  UploadResponse,
} from "./apis";

// 创建TTS API实例
export const ttsApi = new TTSApi(new HttpClient({
  baseURL: import.meta.env.VITE_TTS_URL || "http://localhost:8000",
}));

// 工具函数：创建默认的生成参数
export function createDefaultGenerationParams() {
  return {
    do_sample: true,
    top_p: 0.8,
    top_k: 30,
    temperature: 0.8,
    length_penalty: 0.0,
    num_beams: 3,
    repetition_penalty: 10.0,
    max_mel_tokens: 1500,
  };
}

// 工具函数：创建默认的TTS请求
export function createDefaultTTSRequest(promptFileId: string, text: string) {
  return {
    promptFileId,
    text,
    emoControlMethod: 0,
    emoWeight: 0.8,
    emoRandom: false,
    generation: createDefaultGenerationParams(),
    maxTextTokensPerSegment: 120,
    async_mode: true,
  };
}

// 情感控制方法枚举
export enum EmoControlMethod {
  NONE = 0, // 无情感控制
  REFERENCE = 1, // 参考音频控制
  VECTOR = 2, // 情感向量控制
  TEXT = 3, // 文本描述控制
}

// 任务状态枚举
export enum JobStatus {
  QUEUED = "queued",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}
