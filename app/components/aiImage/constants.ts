import type {
  ActivePreviewAction,
  DirectorToolId,
  DirectorToolOption,
  NovelAiEmotion,
  ProFeatureSectionKey,
  ResolutionPreset,
  ResolutionSelection,
} from "@/components/aiImage/types";

export const STORAGE_UI_MODE_KEY = "tc:ai-image:ui-mode";
export const INTERNAL_HISTORY_IMAGE_DRAG_MIME = "application/x-tuanchat-ai-image-history";
export const DEFAULT_IMAGE_MODEL = "nai-diffusion-4-5-curated";
export const JPEG_REJECT_ERROR = "上游返回 JPEG（有损），已按策略拒绝。请将 NovelAI 输出格式切换为 WebP 或 PNG。";
export const CUSTOM_RESOLUTION_ID = "custom" as const;
export const NOVELAI_DIMENSION_MIN = 64;
export const NOVELAI_DIMENSION_STEP = 64;
export const NOVELAI_FREE_MAX_DIMENSION = 1216;
export const NOVELAI_FREE_MAX_STEPS = 28;
export const NOVELAI_FREE_FIXED_IMAGE_COUNT = 1;
export const NOVELAI_FREE_ONLY_NOTICE = `当前默认禁用大部分会消耗 NovelAI Anlas 的操作；保留免费单张 txt2img，并单独开放 Inpaint（仍限制为单张、${NOVELAI_FREE_MAX_DIMENSION}x${NOVELAI_FREE_MAX_DIMENSION} 以内、steps <= 28）。`;
export const SIMPLE_MODE_MAX_IMAGE_AREA = 1024 * 1024;
export const SIMPLE_MODE_CUSTOM_MAX_DIMENSION = 1024;

export const AVAILABLE_MODEL_OPTIONS = [
  "nai-diffusion-4-5-curated",
  "nai-diffusion-4-5-full",
  "nai-diffusion-4-curated-preview",
  "nai-diffusion-4-full",
  "nai-diffusion-3",
  "nai-diffusion-furry",
  "safe-diffusion",
  "nai-diffusion-2",
  "nai-diffusion",
] as const;

export const SAMPLERS_NAI4 = [
  "k_euler",
  "k_euler_a",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m_sde",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
] as const;

export const NOISE_SCHEDULES_NAI4 = [
  "karras",
  "exponential",
  "polyexponential",
] as const;

export const DIRECTOR_EMOTION_OPTIONS: readonly NovelAiEmotion[] = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "scared",
  "surprised",
  "tired",
  "excited",
  "nervous",
  "thinking",
  "confused",
  "shy",
  "disgusted",
  "smug",
  "bored",
  "laughing",
  "irritated",
  "aroused",
  "embarrassed",
  "worried",
  "love",
  "determined",
  "hurt",
  "playful",
] as const;

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: "portrait", label: "竖版", width: 832, height: 1216 },
  { id: "square", label: "正方形", width: 1024, height: 1024 },
  { id: "landscape", label: "横板", width: 1216, height: 832 },
];

export const DEFAULT_PRO_IMAGE_SETTINGS = {
  width: 832,
  height: 1216,
  imageCount: NOVELAI_FREE_FIXED_IMAGE_COUNT,
  steps: 23,
  scale: 5,
  sampler: "k_euler_a",
  noiseSchedule: "karras",
  cfgRescale: 0,
  ucPreset: 0,
  qualityToggle: true,
  dynamicThresholding: false,
  smea: false,
  smeaDyn: false,
  strength: 0.7,
  noise: 0.2,
  seed: -1,
  simpleResolutionSelection: "portrait" as ResolutionSelection,
} as const;

export const UC_PRESET_OPTIONS = [
  { value: 0, label: "标准预设", description: "附加低质量和解剖问题等常见抑制词。" },
  { value: 1, label: "轻量预设", description: "只附加基础低质量抑制词。" },
  { value: 2, label: "关闭预设", description: "完全使用你手写的 Undesired Content。" },
] as const;

export const DEFAULT_PRO_FEATURE_SECTION_OPEN: Record<ProFeatureSectionKey, boolean> = {
  baseImage: false,
  characterPrompts: true,
  vibeTransfer: true,
  preciseReference: true,
};

export const DIRECTOR_TOOL_OPTIONS: readonly DirectorToolOption[] = [
  { id: "removeBackground", label: "Remove BG", description: "自动抠出主体并移除背景。", requestType: "bg-removal", parameterMode: "none" },
  { id: "lineArt", label: "Line Art", description: "把当前图提取成更干净的线稿。", requestType: "lineart", parameterMode: "none" },
  { id: "sketch", label: "Sketch", description: "把当前图转成更粗放的草图层。", requestType: "sketch", parameterMode: "none" },
  { id: "colorize", label: "Colorize", description: "为线稿或草图重新着色。", requestType: "colorize", parameterMode: "colorize" },
  { id: "emotion", label: "Emotion", description: "在保留主体的前提下调整表情。", requestType: "emotion", parameterMode: "emotion" },
  { id: "declutter", label: "Declutter", description: "清理背景杂物和干扰元素。", requestType: "declutter", parameterMode: "none" },
] as const;

export const DIRECTOR_TOOL_OPTIONS_BY_ID = Object.fromEntries(
  DIRECTOR_TOOL_OPTIONS.map(tool => [tool.id, tool]),
) as Record<DirectorToolId, DirectorToolOption>;

export const PREVIEW_ACTION_LABELS: Record<Exclude<ActivePreviewAction, "">, string> = {
  upscale: "Upscale 4x",
  removeBackground: "Remove BG",
  declutter: "Declutter",
  lineArt: "Line Art",
  sketch: "Sketch",
  colorize: "Colorize",
  emotion: "Emotion",
};

export const SAMPLER_LABELS: Record<string, string> = {
  k_euler_a: "Euler Ancestral",
  k_euler: "Euler",
  k_lms: "LMS",
  ddim: "DDIM",
  plms: "PLMS",
  k_dpmpp_2s_ancestral: "DPM++ 2S Ancestral",
  k_dpmpp_2m_sde: "DPM++ 2M SDE",
  k_dpmpp_2m: "DPM++ 2M",
  k_dpmpp_sde: "DPM++ SDE",
  ddim_v3: "DDIM V3",
};

export const SCHEDULE_LABELS: Record<string, string> = {
  native: "Native",
  karras: "Karras",
  exponential: "Exponential",
  polyexponential: "Polyexponential",
};

export const MODEL_DESCRIPTIONS: Record<string, string> = {
  "nai-diffusion-4-5-curated": "A version of our newest model trained on a curated subset of images. Recommended for streaming.",
  "nai-diffusion-4-5-full": "Our newest and best model.",
  "nai-diffusion-4-curated-preview": "A curated preview model with stronger prompt adherence.",
  "nai-diffusion-4-full": "NAI Diffusion V4 full model.",
  "nai-diffusion-3": "Balanced anime image model with classic NAI controls.",
  "nai-diffusion-furry": "Optimized for furry and kemono content.",
  "safe-diffusion": "A safer general-purpose diffusion model.",
  "nai-diffusion-2": "NAI Diffusion V2 legacy model.",
  "nai-diffusion": "Original NAI Diffusion model.",
};
