/**
 * GPT-SoVITS TTS 相关类型定义
 */

export type TTSParams = {
  text: string;
  text_lang: string;
  ref_audio_path: string;
  prompt_text: string;
  prompt_lang: string;
  top_k?: number;
  top_p?: number;
  temperature?: number;
  text_split_method?: string;
  batch_size?: number;
  speed_factor?: number;
  streaming_mode?: boolean;
  seed?: number;
  parallel_infer?: boolean;
  repetition_penalty?: number;
};

export type APIConfig = {
  apiUrl: string;
  isConnected: boolean;
};

export type TTSPreset = {
  name: string;
  text_lang: string;
  ref_audio_path: string;
  prompt_text: string;
  prompt_lang: string;
  top_k: number;
  top_p: number;
  temperature: number;
  text_split_method: string;
  batch_size: number;
  speed_factor: number;
  streaming_mode: boolean;
  seed: number;
  parallel_infer: boolean;
  repetition_penalty: number;
};

export const LANGUAGES = {
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
} as const;

export const SPLIT_METHODS = {
  cut0: "不切",
  cut1: "凑四句一切",
  cut2: "凑50字一切",
  cut3: "按中文句号。切",
  cut4: "按英文句号.切",
  cut5: "按标点符号切",
} as const;

export const DEFAULT_TTS_PARAMS: TTSPreset = {
  name: "Default",
  text_lang: "all_zh",
  ref_audio_path: "",
  prompt_text: "",
  prompt_lang: "all_zh",
  top_k: 5,
  top_p: 1.0,
  temperature: 1.0,
  text_split_method: "cut1",
  batch_size: 1,
  speed_factor: 1.0,
  streaming_mode: false,
  seed: -1,
  parallel_infer: false,
  repetition_penalty: 1.35,
};
