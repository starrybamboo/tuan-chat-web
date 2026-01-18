// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互，并复用仓库内 `api/novelai` 的请求类型作为 SSOT。
import type { AiGenerateImageRequest } from "../../api/novelai/models/AiGenerateImageRequest";
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";
import { unzipSync } from "fflate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addAiImageHistory,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import { getAiImageStylePresets } from "@/utils/aiImageStylePresets";
import { isElectronEnv } from "@/utils/isElectronEnv";
import { convertNaturalLanguageToNovelAiTags } from "@/utils/novelaiNl2Tags";

type RequestMode = "direct" | "proxy";
type UiMode = "simple" | "pro";

interface V4PromptCenter {
  x: number;
  y: number;
}

interface V4CharPayload {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
}

interface V4CharEditorRow extends V4CharPayload {
  id: string;
}

const DEFAULT_IMAGE_ENDPOINT = "https://image.novelai.net";
const STORAGE_TOKEN_KEY = "tc:ai-image:novelai-token";
const STORAGE_REQUEST_MODE_KEY = "tc:ai-image:request-mode";
const STORAGE_UI_MODE_KEY = "tc:ai-image:ui-mode";
const LOCKED_IMAGE_MODEL = "nai-diffusion-4-5-full";

const SAMPLERS_NAI3 = [
  "k_euler",
  "k_euler_a",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
  "ddim_v3",
] as const;

const SAMPLERS_NAI4 = [
  "k_euler",
  "k_euler_a",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m_sde",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
] as const;

const SAMPLERS_BASE = [
  "k_euler_a",
  "k_euler",
  "k_lms",
  "ddim",
  "plms",
] as const;

const NOISE_SCHEDULES = [
  "native",
  "karras",
  "exponential",
  "polyexponential",
] as const;

function clamp01(input: number, fallback = 0.5) {
  const value = Number(input);
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(0, Math.min(1, value));
}

function makeStableId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      return crypto.randomUUID();
  }
  catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newV4CharEditorRow(): V4CharEditorRow {
  return {
    id: makeStableId(),
    prompt: "",
    negativePrompt: "",
    centerX: 0.5,
    centerY: 0.5,
  };
}

function mergeTagString(base: string, extraTags: string[]) {
  const a = String(base || "");
  const list = a
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const uniq = new Set<string>();
  for (const item of [...extraTags, ...list]) {
    const value = String(item || "").trim();
    if (!value)
      continue;
    uniq.add(value);
  }

  return Array.from(uniq).join(", ");
}

function normalizeEndpoint(input: string) {
  const value = String(input || "").trim();
  if (!value)
    return "";
  return value.replace(/\/+$/, "");
}

function maybeCorsHintFromError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch/i.test(message) || /networkerror/i.test(message) || /fetch failed/i.test(message))
    return "（可能是浏览器跨域/CORS 拦截或网络被阻断）";
  return "";
}

function clampToMultipleOf64(value: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    return fallback;
  return Math.max(64, Math.round(num / 64) * 64);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64DataUrl(mime: string, bytes: Uint8Array) {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

function mimeFromFilename(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png"))
    return "image/png";
  if (lower.endsWith(".webp"))
    return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    return "image/jpeg";
  return "application/octet-stream";
}

function startsWithBytes(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length)
    return false;
  return prefix.every((b, i) => bytes[i] === b);
}

function looksLikeZip(bytes: Uint8Array) {
  if (bytes.length < 4)
    return false;
  return (
    bytes[0] === 0x50
    && bytes[1] === 0x4B
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

function detectBinaryDataUrl(bytes: Uint8Array) {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return base64DataUrl("image/png", bytes);

  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return base64DataUrl("image/jpeg", bytes);

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return base64DataUrl("image/webp", bytes);
  }

  return "";
}

function firstImageFromZip(zipBytes: Uint8Array) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names.find(n => /\.(?:png|webp|jpe?g)$/i.test(n)) || names[0];
  return base64DataUrl(mimeFromFilename(preferred), files[preferred]);
}

async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("读取图片尺寸失败"));
    img.src = dataUrl;
  });
}

function modelLabel(value: string) {
  if (value === "nai-diffusion-4-5-full")
    return "NAI v4.5 Full";
  if (value === "nai-diffusion-4-5-curated")
    return "NAI v4.5 Curated";
  if (value === "nai-diffusion-4-full")
    return "NAI v4 Full";
  if (value === "nai-diffusion-4-curated-preview")
    return "NAI v4 Curated Preview";
  if (value === "nai-diffusion-3")
    return "NAI v3";
  if (value === "nai-diffusion-2")
    return "NAI v2";
  if (value === "nai-diffusion")
    return "NAI";
  if (value === "nai-diffusion-furry")
    return "NAI Furry";
  if (value === "safe-diffusion")
    return "Safe Diffusion";
  return value;
}

function isNaiV4Family(model: string) {
  const value = String(model || "").trim();
  if (!value)
    return false;
  return value === "nai-diffusion-4-curated-preview"
    || value === "nai-diffusion-4-full"
    || value === "nai-diffusion-4-full-inpainting"
    || value === "nai-diffusion-4-curated-inpainting"
    || value === "nai-diffusion-4-5-curated"
    || value === "nai-diffusion-4-5-curated-inpainting"
    || value === "nai-diffusion-4-5-full"
    || value === "nai-diffusion-4-5-full-inpainting";
}

async function generateNovelImageViaProxy(args: {
  token: string;
  endpoint: string;
  mode: AiImageHistoryMode;
  sourceImageBase64?: string;
  strength: number;
  noise: number;
  prompt: string;
  negativePrompt: string;
  v4Chars?: V4CharPayload[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  smea: boolean;
  smeaDyn: boolean;
  qualityToggle: boolean;
  seed?: number;
}) {
  const token = String(args.token || "").trim();
  if (!token)
    throw new Error("缺少 NovelAI token（Bearer）");

  const endpoint = normalizeEndpoint(args.endpoint) || DEFAULT_IMAGE_ENDPOINT;
  const prompt = String(args.prompt || "").trim();
  if (!prompt)
    throw new Error("缺少 prompt");

  const negativePrompt = String(args.negativePrompt || "");
  const model = String(args.model || LOCKED_IMAGE_MODEL);

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = isNaiV4Family(model);

  const seed = typeof args.seed === "number" ? args.seed : Math.floor(Math.random() * 2 ** 32);
  const width = clampToMultipleOf64(args.width, 1024);
  const height = clampToMultipleOf64(args.height, 1024);

  const resolvedSampler = args.sampler === "k_euler_a" ? "k_euler_ancestral" : args.sampler;

  const parameters: Record<string, any> = {
    seed,
    width,
    height,
    n_samples: 1,
    steps: Math.max(1, Math.floor(args.steps)),
    scale: Number(args.scale),
    sampler: resolvedSampler,
    negative_prompt: negativePrompt,
    ucPreset: 2,
    qualityToggle: Boolean(args.qualityToggle),
  };

  if (args.mode === "img2img") {
    const imageBase64 = String(args.sourceImageBase64 || "").trim();
    if (!imageBase64)
      throw new Error("img2img 缺少源图片（sourceImageBase64）");

    const strength = Number.isFinite(args.strength) ? Number(args.strength) : 0.7;
    const noise = Number.isFinite(args.noise) ? Number(args.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.strength = Math.max(0, Math.min(1, strength));
    parameters.noise = Math.max(0, Math.min(1, noise));
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.legacy = false;
    parameters.legacy_v3_extend = false;
    parameters.noise_schedule = args.noiseSchedule;

    if (isNAI4) {
      const cfgRescale = Number.isFinite(args.cfgRescale) ? Number(args.cfgRescale) : 0;
      const useCoords = Boolean(args.v4UseCoords);
      const useOrder = args.v4UseOrder == null ? true : Boolean(args.v4UseOrder);
      const v4Chars = Array.isArray(args.v4Chars) ? args.v4Chars : [];
      const charCenters: V4PromptCenter[] = [];
      const charCaptionsPositive = v4Chars.map((item) => {
        const center: V4PromptCenter = {
          x: clamp01(item.centerX, 0.5),
          y: clamp01(item.centerY, 0.5),
        };
        charCenters.push(center);
        return {
          char_caption: String(item.prompt || ""),
          centers: [center],
        };
      });
      const charCaptionsNegative = v4Chars.map((item, idx) => {
        const center = charCenters[idx] || { x: 0.5, y: 0.5 };
        return {
          char_caption: String(item.negativePrompt || ""),
          centers: [center],
        };
      });

      parameters.add_original_image = true;
      parameters.cfg_rescale = cfgRescale;
      parameters.characterPrompts = [];
      parameters.controlnet_strength = 1;
      parameters.deliberate_euler_ancestral_bug = false;
      parameters.prefer_brownian = true;
      parameters.reference_image_multiple = [];
      parameters.reference_information_extracted_multiple = [];
      parameters.reference_strength_multiple = [];
      parameters.skip_cfg_above_sigma = null;
      parameters.use_coords = useCoords;
      parameters.v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: charCaptionsPositive,
        },
        use_coords: parameters.use_coords,
        use_order: useOrder,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: negativePrompt,
          char_captions: charCaptionsNegative,
        },
      };
    }
    else if (isNAI3) {
      const smea = Boolean(args.smea);
      const smeaDyn = Boolean(args.smeaDyn);
      parameters.sm_dyn = smeaDyn;
      parameters.sm = smea || smeaDyn;

      if (
        (resolvedSampler === "k_euler_ancestral" || resolvedSampler === "k_dpmpp_2s_ancestral")
        && args.noiseSchedule === "karras"
      ) {
        parameters.noise_schedule = "native";
      }
      if (resolvedSampler === "ddim_v3") {
        parameters.sm = false;
        parameters.sm_dyn = false;
        delete parameters.noise_schedule;
      }
      if (Number.isFinite(parameters.scale) && parameters.scale > 10) {
        parameters.scale = parameters.scale / 2;
      }
    }
  }

  const payload: AiGenerateImageRequest = {
    input: prompt,
    model: model as unknown as AiGenerateImageRequest.model,
    action: (args.mode === "img2img" ? "img2img" : "generate") as AiGenerateImageRequest.action,
    parameters,
  };

  const endpointHeader = normalizeEndpoint(endpoint);
  const res = await fetch("/api/novelapi/ai/generate-image", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/octet-stream",
      "X-NovelAPI-Endpoint": endpointHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  let dataUrl = detectBinaryDataUrl(bytes);
  if (!dataUrl && looksLikeZip(bytes))
    dataUrl = firstImageFromZip(bytes);

  if (!dataUrl) {
    const text = await new Response(bytes).text().catch(() => "");
    throw new Error(`响应不是可识别的图片/ZIP${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  return { dataUrl, seed, width, height, model };
}

async function generateNovelImageDirect(args: {
  token: string;
  endpoint: string;
  mode: AiImageHistoryMode;
  sourceImageBase64?: string;
  strength: number;
  noise: number;
  prompt: string;
  negativePrompt: string;
  v4Chars?: V4CharPayload[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  smea: boolean;
  smeaDyn: boolean;
  qualityToggle: boolean;
  seed?: number;
}) {
  const token = String(args.token || "").trim();
  if (!token)
    throw new Error("缺少 NovelAI token（Bearer）");

  const endpoint = normalizeEndpoint(args.endpoint) || DEFAULT_IMAGE_ENDPOINT;
  const prompt = String(args.prompt || "").trim();
  if (!prompt)
    throw new Error("缺少 prompt");

  const negativePrompt = String(args.negativePrompt || "");
  const model = String(args.model || LOCKED_IMAGE_MODEL);

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = isNaiV4Family(model);

  const seed = typeof args.seed === "number" ? args.seed : Math.floor(Math.random() * 2 ** 32);
  const width = clampToMultipleOf64(args.width, 1024);
  const height = clampToMultipleOf64(args.height, 1024);

  const resolvedSampler = args.sampler === "k_euler_a" ? "k_euler_ancestral" : args.sampler;

  const parameters: Record<string, any> = {
    seed,
    width,
    height,
    n_samples: 1,
    steps: Math.max(1, Math.floor(args.steps)),
    scale: Number(args.scale),
    sampler: resolvedSampler,
    negative_prompt: negativePrompt,
    ucPreset: 2,
    qualityToggle: Boolean(args.qualityToggle),
  };

  if (args.mode === "img2img") {
    const imageBase64 = String(args.sourceImageBase64 || "").trim();
    if (!imageBase64)
      throw new Error("img2img 缺少源图片（sourceImageBase64）");

    const strength = Number.isFinite(args.strength) ? Number(args.strength) : 0.7;
    const noise = Number.isFinite(args.noise) ? Number(args.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.strength = Math.max(0, Math.min(1, strength));
    parameters.noise = Math.max(0, Math.min(1, noise));
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.legacy = false;
    parameters.legacy_v3_extend = false;
    parameters.noise_schedule = args.noiseSchedule;

    if (isNAI4) {
      const cfgRescale = Number.isFinite(args.cfgRescale) ? Number(args.cfgRescale) : 0;
      const useCoords = Boolean(args.v4UseCoords);
      const useOrder = args.v4UseOrder == null ? true : Boolean(args.v4UseOrder);
      const v4Chars = Array.isArray(args.v4Chars) ? args.v4Chars : [];
      const charCenters: V4PromptCenter[] = [];
      const charCaptionsPositive = v4Chars.map((item) => {
        const center: V4PromptCenter = {
          x: clamp01(item.centerX, 0.5),
          y: clamp01(item.centerY, 0.5),
        };
        charCenters.push(center);
        return {
          char_caption: String(item.prompt || ""),
          centers: [center],
        };
      });
      const charCaptionsNegative = v4Chars.map((item, idx) => {
        const center = charCenters[idx] || { x: 0.5, y: 0.5 };
        return {
          char_caption: String(item.negativePrompt || ""),
          centers: [center],
        };
      });

      parameters.add_original_image = true;
      parameters.cfg_rescale = cfgRescale;
      parameters.characterPrompts = [];
      parameters.controlnet_strength = 1;
      parameters.deliberate_euler_ancestral_bug = false;
      parameters.prefer_brownian = true;
      parameters.reference_image_multiple = [];
      parameters.reference_information_extracted_multiple = [];
      parameters.reference_strength_multiple = [];
      parameters.skip_cfg_above_sigma = null;
      parameters.use_coords = useCoords;
      parameters.v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: charCaptionsPositive,
        },
        use_coords: parameters.use_coords,
        use_order: useOrder,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: negativePrompt,
          char_captions: charCaptionsNegative,
        },
      };
    }
    else if (isNAI3) {
      const smea = Boolean(args.smea);
      const smeaDyn = Boolean(args.smeaDyn);
      parameters.sm_dyn = smeaDyn;
      parameters.sm = smea || smeaDyn;

      if (
        (resolvedSampler === "k_euler_ancestral" || resolvedSampler === "k_dpmpp_2s_ancestral")
        && args.noiseSchedule === "karras"
      ) {
        parameters.noise_schedule = "native";
      }
      if (resolvedSampler === "ddim_v3") {
        parameters.sm = false;
        parameters.sm_dyn = false;
        delete parameters.noise_schedule;
      }
      if (Number.isFinite(parameters.scale) && parameters.scale > 10) {
        parameters.scale = parameters.scale / 2;
      }
    }
  }

  const payload: AiGenerateImageRequest = {
    input: prompt,
    model: model as unknown as AiGenerateImageRequest.model,
    action: (args.mode === "img2img" ? "img2img" : "generate") as AiGenerateImageRequest.action,
    parameters,
    url: endpoint,
  };

  const url = `${endpoint}/ai/generate-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/octet-stream",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const hint = maybeCorsHintFromError(text);
    throw new Error(`请求失败: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}${hint ? ` ${hint}` : ""}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  let dataUrl = detectBinaryDataUrl(bytes);
  if (!dataUrl && looksLikeZip(bytes))
    dataUrl = firstImageFromZip(bytes);

  if (!dataUrl) {
    const text = await new Response(bytes).text().catch(() => "");
    throw new Error(`响应不是可识别的图片/ZIP${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  return { dataUrl, seed, width, height, model };
}

/* __SEGMENT_2_END__ */

function readLocalStorageString(key: string, fallback: string) {
  if (typeof window === "undefined")
    return fallback;
  try {
    const value = String(window.localStorage.getItem(key) || "");
    return value || fallback;
  }
  catch {
    return fallback;
  }
}

function writeLocalStorageString(key: string, value: string) {
  if (typeof window === "undefined")
    return;
  try {
    window.localStorage.setItem(key, value);
  }
  catch {
    // ignore
  }
}

function dataUrlToBase64(dataUrl: string) {
  const value = String(dataUrl || "");
  const idx = value.indexOf(",");
  if (idx < 0)
    return "";
  return value.slice(idx + 1).trim();
}

export default function AiImagePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const stored = readLocalStorageString(STORAGE_UI_MODE_KEY, "simple").trim();
    return stored === "pro" ? "pro" : "simple";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    writeLocalStorageString(STORAGE_UI_MODE_KEY, uiMode);
  }, [uiMode]);

  const [token, setToken] = useState(() => readLocalStorageString(STORAGE_TOKEN_KEY, ""));
  const [endpoint, setEndpoint] = useState(DEFAULT_IMAGE_ENDPOINT);
  const [requestMode, setRequestMode] = useState<RequestMode>(() => {
    const stored = readLocalStorageString(STORAGE_REQUEST_MODE_KEY, "proxy").trim();
    return stored === "direct" ? "direct" : "proxy";
  });

  useEffect(() => {
    writeLocalStorageString(STORAGE_TOKEN_KEY, token);
  }, [token]);

  useEffect(() => {
    writeLocalStorageString(STORAGE_REQUEST_MODE_KEY, requestMode);
  }, [requestMode]);

  const [mode, setMode] = useState<AiImageHistoryMode>("txt2img");
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState("");
  const [sourceImageBase64, setSourceImageBase64] = useState("");

  const [simpleText, setSimpleText] = useState("");
  const [simpleConvertedFromText, setSimpleConvertedFromText] = useState("");
  const [simpleConverted, setSimpleConverted] = useState<NovelAiNl2TagsResult | null>(null);
  const [simpleConverting, setSimpleConverting] = useState(false);
  const [simpleError, setSimpleError] = useState("");
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [proPromptTab, setProPromptTab] = useState<"positive" | "negative">("positive");

  const [v4UseCoords, setV4UseCoords] = useState(false);
  const [v4UseOrder, setV4UseOrder] = useState(true);
  const [v4Chars, setV4Chars] = useState<V4CharEditorRow[]>([]);

  const model: string = LOCKED_IMAGE_MODEL;
  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = isNaiV4Family(model);

  useEffect(() => {
    if (uiMode !== "simple")
      return;
    setMode("txt2img");
    setSourceImageDataUrl("");
    setSourceImageBase64("");
  }, [uiMode]);

  const stylePresets = useMemo(() => getAiImageStylePresets(), []);
  const selectedStylePresets = useMemo(() => {
    const index = new Map<string, AiImageStylePreset>(stylePresets.map(p => [p.id, p]));
    return selectedStyleIds.map(id => index.get(id)).filter(Boolean) as AiImageStylePreset[];
  }, [selectedStyleIds, stylePresets]);

  const selectedStyleTags = useMemo(() => {
    return selectedStylePresets.flatMap(p => p.tags);
  }, [selectedStylePresets]);

  const selectedStyleNegativeTags = useMemo(() => {
    return selectedStylePresets.flatMap(p => p.negativeTags);
  }, [selectedStylePresets]);

  const samplerOptions = useMemo(() => {
    if (isNAI4)
      return SAMPLERS_NAI4;
    if (isNAI3)
      return SAMPLERS_NAI3;
    return SAMPLERS_BASE;
  }, [isNAI3, isNAI4]);

  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [scale, setScale] = useState(5);
  const [sampler, setSampler] = useState("k_euler_a");
  const [noiseSchedule, setNoiseSchedule] = useState("karras");
  const [cfgRescale, setCfgRescale] = useState(0);
  const [smea] = useState(false);
  const [smeaDyn] = useState(false);
  const [qualityToggle, setQualityToggle] = useState(false);
  const [strength, setStrength] = useState(0.7);
  const [noise, setNoise] = useState(0.2);

  const [seed, setSeed] = useState<number>(-1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ dataUrl: string; seed: number; width: number; height: number; model: string } | null>(null);

  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);

  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handlePickSourceImage = useCallback(async (file: File) => {
    const bytes = await readFileAsBytes(file);
    const mime = file.type || mimeFromFilename(file.name);
    const dataUrl = base64DataUrl(mime, bytes);
    setSourceImageDataUrl(dataUrl);
    setSourceImageBase64(bytesToBase64(bytes));
    try {
      const size = await readImageSize(dataUrl);
      setWidth(clampToMultipleOf64(size.width, 1024));
      setHeight(clampToMultipleOf64(size.height, 1024));
    }
    catch {
      // ignore
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    await refreshHistory();
  }, [refreshHistory]);

  const runGenerate = useCallback(async (args?: { prompt?: string; negativePrompt?: string; mode?: AiImageHistoryMode }) => {
    const effectiveMode = args?.mode ?? mode;
    const effectivePrompt = String(args?.prompt ?? prompt).trim();
    const effectiveNegative = String(args?.negativePrompt ?? negativePrompt);
    const v4CharsPayload = isNAI4 && uiMode === "pro" ? v4Chars.map(({ id, ...rest }) => rest) : undefined;
    const v4UseCoordsPayload = uiMode === "pro" ? v4UseCoords : undefined;
    const v4UseOrderPayload = uiMode === "pro" ? v4UseOrder : undefined;

    setError("");
    setLoading(true);
    try {
      const seedInput = Number(seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const generator = requestMode === "direct" ? generateNovelImageDirect : generateNovelImageViaProxy;
      const res = await generator({
        token,
        endpoint,
        mode: effectiveMode,
        sourceImageBase64: effectiveMode === "img2img" ? sourceImageBase64 : undefined,
        strength,
        noise,
        prompt: effectivePrompt,
        negativePrompt: effectiveNegative,
        v4Chars: v4CharsPayload,
        v4UseCoords: v4UseCoordsPayload,
        v4UseOrder: v4UseOrderPayload,
        model,
        width,
        height,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        smea,
        smeaDyn,
        qualityToggle,
        seed: seedValue,
      });

      setResult(res);
      setSeed(seedValue == null ? -1 : res.seed);
      await addAiImageHistory({
        createdAt: Date.now(),
        mode: effectiveMode,
        model: res.model,
        seed: res.seed,
        width: res.width,
        height: res.height,
        prompt: effectivePrompt,
        negativePrompt: effectiveNegative,
        v4Chars: v4CharsPayload,
        v4UseCoords: v4UseCoordsPayload ?? false,
        v4UseOrder: v4UseOrderPayload ?? true,
        dataUrl: res.dataUrl,
        sourceDataUrl: effectiveMode === "img2img" ? sourceImageDataUrl : undefined,
      });
      await refreshHistory();
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
    finally {
      setLoading(false);
    }
  }, [
    cfgRescale,
    endpoint,
    height,
    mode,
    model,
    isNAI4,
    negativePrompt,
    noise,
    noiseSchedule,
    prompt,
    qualityToggle,
    refreshHistory,
    requestMode,
    sampler,
    scale,
    seed,
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    steps,
    strength,
    token,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    width,
  ]);

  const handleSimpleGenerate = useCallback(async () => {
    setSimpleError("");
    const trimmed = simpleText.trim();
    if (!trimmed) {
      if (!prompt.trim()) {
        setSimpleError("请先输入一行自然语言描述");
        return;
      }
      const effectivePrompt = mergeTagString(prompt, [...selectedStyleIds, ...selectedStyleTags]);
      const effectiveNegativePrompt = mergeTagString(negativePrompt, selectedStyleNegativeTags);
      await runGenerate({ mode: "txt2img", prompt: effectivePrompt, negativePrompt: effectiveNegativePrompt });
      return;
    }

    let resolvedPrompt = prompt;
    let resolvedNegativePrompt = negativePrompt;
    if (simpleConvertedFromText !== trimmed || !simpleConverted) {
      setSimpleConverting(true);
      try {
        const converted = await convertNaturalLanguageToNovelAiTags({ input: trimmed });
        setSimpleConverted(converted);
        setSimpleConvertedFromText(trimmed);
        setPrompt(converted.prompt);
        setNegativePrompt(converted.negativePrompt);
        resolvedPrompt = converted.prompt;
        resolvedNegativePrompt = converted.negativePrompt;
      }
      catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setSimpleError(message);
        return;
      }
      finally {
        setSimpleConverting(false);
      }
    }

    if (!String(resolvedPrompt || "").trim()) {
      setSimpleError("prompt 为空：请先完成自然语言转换或手动编辑 tags");
      return;
    }

    const effectivePrompt = mergeTagString(resolvedPrompt, [...selectedStyleIds, ...selectedStyleTags]);
    const effectiveNegativePrompt = mergeTagString(resolvedNegativePrompt, selectedStyleNegativeTags);
    await runGenerate({ mode: "txt2img", prompt: effectivePrompt, negativePrompt: effectiveNegativePrompt });
  }, [
    negativePrompt,
    prompt,
    runGenerate,
    selectedStyleNegativeTags,
    selectedStyleTags,
    simpleConverted,
    simpleConvertedFromText,
    simpleText,
  ]);

  const handleLoadHistory = useCallback((row: AiImageHistoryRow) => {
    const effectiveMode: AiImageHistoryMode = uiMode === "simple" ? "txt2img" : row.mode;
    setMode(effectiveMode);
    setPrompt(row.prompt);
    setNegativePrompt(row.negativePrompt);
    setV4UseCoords(Boolean(row.v4UseCoords));
    setV4UseOrder(row.v4UseOrder == null ? true : Boolean(row.v4UseOrder));
    setV4Chars(
      Array.isArray(row.v4Chars)
        ? row.v4Chars.map((item) => {
            return {
              id: makeStableId(),
              prompt: String(item.prompt || ""),
              negativePrompt: String(item.negativePrompt || ""),
              centerX: clamp01(item.centerX, 0.5),
              centerY: clamp01(item.centerY, 0.5),
            };
          })
        : [],
    );
    setSeed(row.seed);
    setWidth(row.width);
    setHeight(row.height);
    setResult({ dataUrl: row.dataUrl, seed: row.seed, width: row.width, height: row.height, model: row.model });
    if (effectiveMode === "img2img" && row.sourceDataUrl) {
      setSourceImageDataUrl(row.sourceDataUrl);
      setSourceImageBase64(dataUrlToBase64(row.sourceDataUrl));
    }
  }, [uiMode]);

  const handleDeleteCurrentHistory = useCallback(async () => {
    const selectedDataUrl = result?.dataUrl;
    if (!selectedDataUrl)
      return;
    const row = history.find(h => h.dataUrl === selectedDataUrl);
    if (!row || typeof row.id !== "number")
      return;
    await deleteAiImageHistory(row.id);
    await refreshHistory();
  }, [history, refreshHistory, result?.dataUrl]);

  const handleToggleStyle = useCallback((id: string) => {
    setSelectedStyleIds((prev) => {
      if (prev.includes(id))
        return prev.filter(item => item !== id);
      return [...prev, id];
    });
  }, []);

  const handleClearStyles = useCallback(() => {
    setSelectedStyleIds([]);
  }, []);

  const handleAddV4Char = useCallback(() => {
    setV4Chars(prev => [...prev, newV4CharEditorRow()]);
  }, []);

  const handleRemoveV4Char = useCallback((id: string) => {
    setV4Chars(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleMoveV4Char = useCallback((id: string, direction: -1 | 1) => {
    setV4Chars((prev) => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx < 0)
        return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length)
        return prev;
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved);
      return next;
    });
  }, []);

  const handleUpdateV4Char = useCallback((id: string, patch: Partial<V4CharEditorRow>) => {
    setV4Chars(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const canGenerate = !loading && !simpleConverting;

  return (
    <div className="h-screen w-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file)
            return;
          void handlePickSourceImage(file);
          e.target.value = "";
        }}
      />

      <div className="px-4 py-3 border-b border-base-300 flex items-center gap-3">
        <div className="join">
          <button
            type="button"
            className={`btn btn-sm join-item ${uiMode === "simple" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setUiMode("simple")}
          >
            普通模式
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item ${uiMode === "pro" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setUiMode("pro")}
          >
            专业模式
          </button>
        </div>

        {uiMode !== "simple"
          ? (
              <div className="text-xs opacity-70">
                模型已锁定：
                {modelLabel(model)}
              </div>
            )
          : null}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            设置
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-[380px] shrink-0 border-r border-base-300 overflow-auto p-3 flex flex-col gap-3">
          {uiMode !== "simple"
            ? (
                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">模式</div>
                      <div className="ml-auto join">
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${mode === "txt2img" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setMode("txt2img")}
                        >
                          txt2img
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${mode === "img2img" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setMode("img2img")}
                        >
                          img2img
                        </button>
                      </div>
                    </div>

                    {mode === "img2img"
                      ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                                选择源图
                              </button>
                              {result?.dataUrl
                                ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost"
                                      onClick={() => {
                                        setSourceImageDataUrl(result.dataUrl);
                                        setSourceImageBase64(dataUrlToBase64(result.dataUrl));
                                      }}
                                    >
                                      使用当前结果
                                    </button>
                                  )
                                : null}
                            </div>
                            <div className="bg-base-100 rounded-box p-2 min-h-28 flex items-center justify-center">
                              {sourceImageDataUrl
                                ? <img src={sourceImageDataUrl} className="max-h-40 w-auto rounded-box" alt="source" />
                                : <div className="text-sm opacity-60">未选择源图</div>}
                            </div>
                          </div>
                        )
                      : null}
                  </div>
                </div>
              )
            : null}

          <div className="card bg-base-200">
            <div className="card-body gap-3">
              <div className="flex items-center gap-2">
                <div className="font-medium">Prompt</div>
                {uiMode === "pro" && isNAI4
                  ? (
                      <div className="ml-auto flex items-center gap-2">
                        <label className="label cursor-pointer justify-start gap-2 py-0">
                          <input type="checkbox" className="toggle toggle-sm" checked={v4UseOrder} onChange={e => setV4UseOrder(e.target.checked)} />
                          <span className="label-text text-xs">顺序</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-2 py-0">
                          <input type="checkbox" className="toggle toggle-sm" checked={v4UseCoords} onChange={e => setV4UseCoords(e.target.checked)} />
                          <span className="label-text text-xs">坐标</span>
                        </label>
                      </div>
                    )
                  : null}
              </div>

              {uiMode === "simple"
                ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm opacity-80">一行自然语言 → 自动转换 tags → 出图</div>
                      <input
                        className="input input-bordered w-full"
                        value={simpleText}
                        onChange={(e) => {
                          const next = e.target.value;
                          setSimpleText(next);
                          if (simpleConverted) {
                            setSimpleConverted(null);
                            setSimpleConvertedFromText("");
                            setPrompt("");
                            setNegativePrompt("");
                            setV4Chars([]);
                          }
                        }}
                        placeholder="例如：A girl with silver hair in a rainy cyberpunk street, cinematic lighting"
                      />

                      {simpleError ? <div className="text-sm text-error">{simpleError}</div> : null}

                      {prompt.trim()
                        ? (
                            <div className="flex flex-col gap-2">
                              <div className="text-xs opacity-70">最终 tags（可编辑后再次生成）：</div>
                              <textarea
                                className="textarea textarea-bordered w-full min-h-24"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                              />

                              <details className="collapse bg-base-100">
                                <summary className="collapse-title text-sm">负面 tags（可选）</summary>
                                <div className="collapse-content">
                                  <textarea
                                    className="textarea textarea-bordered w-full min-h-20"
                                    value={negativePrompt}
                                    onChange={e => setNegativePrompt(e.target.value)}
                                    placeholder="例如：lowres, bad anatomy"
                                  />
                                </div>
                              </details>
                            </div>
                          )
                        : null}
                    </div>
                  )
                : (
                    <div className="flex flex-col gap-3">
                      <div className="join">
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${proPromptTab === "positive" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setProPromptTab("positive")}
                        >
                          正面
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${proPromptTab === "negative" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setProPromptTab("negative")}
                        >
                          负面
                        </button>
                      </div>

                      <div className="text-xs opacity-70">{proPromptTab === "positive" ? "背景（base_caption）" : "负面背景（base_caption）"}</div>
                      <textarea
                        className="textarea textarea-bordered w-full min-h-24"
                        value={proPromptTab === "positive" ? prompt : negativePrompt}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (proPromptTab === "positive")
                            setPrompt(next);
                          else
                            setNegativePrompt(next);
                        }}
                      />

                      {isNAI4
                        ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <div className="text-xs opacity-70">角色（char_captions）</div>
                                <div className="ml-auto flex items-center gap-2">
                                  <div className="text-xs opacity-60">{v4Chars.length ? `共 ${v4Chars.length} 个` : "暂无"}</div>
                                  <button type="button" className="btn btn-xs" onClick={handleAddV4Char}>
                                    添加角色
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3">
                                {v4Chars.map((row, idx) => {
                                  const disabledUp = idx === 0 || !v4UseOrder;
                                  const disabledDown = idx === v4Chars.length - 1 || !v4UseOrder;
                                  const value = proPromptTab === "positive" ? row.prompt : row.negativePrompt;
                                  return (
                                    <div key={row.id} className="bg-base-100 rounded-box p-2 flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium">{`角色 ${idx + 1}`}</div>
                                        <div className="ml-auto join">
                                          <button
                                            type="button"
                                            className={`btn btn-xs join-item ${disabledUp ? "btn-disabled" : ""}`}
                                            onClick={() => handleMoveV4Char(row.id, -1)}
                                            disabled={disabledUp}
                                          >
                                            上移
                                          </button>
                                          <button
                                            type="button"
                                            className={`btn btn-xs join-item ${disabledDown ? "btn-disabled" : ""}`}
                                            onClick={() => handleMoveV4Char(row.id, 1)}
                                            disabled={disabledDown}
                                          >
                                            下移
                                          </button>
                                        </div>
                                        <button type="button" className="btn btn-xs btn-ghost" onClick={() => handleRemoveV4Char(row.id)}>
                                          删除
                                        </button>
                                      </div>

                                      <textarea
                                        className="textarea textarea-bordered w-full min-h-20"
                                        value={value}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          if (proPromptTab === "positive")
                                            handleUpdateV4Char(row.id, { prompt: next });
                                          else
                                            handleUpdateV4Char(row.id, { negativePrompt: next });
                                        }}
                                      />

                                      {v4UseCoords
                                        ? (
                                            <div className="grid grid-cols-2 gap-2">
                                              <label className="form-control">
                                                <span className="label-text text-xs">Center X (0-1)</span>
                                                <input
                                                  className="input input-bordered input-sm"
                                                  type="number"
                                                  min="0"
                                                  max="1"
                                                  step="0.01"
                                                  value={row.centerX}
                                                  onChange={e => handleUpdateV4Char(row.id, { centerX: clamp01(Number(e.target.value), 0.5) })}
                                                />
                                              </label>
                                              <label className="form-control">
                                                <span className="label-text text-xs">Center Y (0-1)</span>
                                                <input
                                                  className="input input-bordered input-sm"
                                                  type="number"
                                                  min="0"
                                                  max="1"
                                                  step="0.01"
                                                  value={row.centerY}
                                                  onChange={e => handleUpdateV4Char(row.id, { centerY: clamp01(Number(e.target.value), 0.5) })}
                                                />
                                              </label>
                                            </div>
                                          )
                                        : null}
                                    </div>
                                  );
                                })}
                                {!v4Chars.length
                                  ? (
                                      <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddV4Char}>
                                        添加第一个角色
                                      </button>
                                    )
                                  : null}
                              </div>
                            </div>
                          )
                        : null}
                    </div>
                  )}
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body gap-3">
              <div className="flex items-center gap-2">
                <div className="font-medium">参数</div>
                {uiMode !== "simple"
                  ? <div className="ml-auto text-xs opacity-70">{modelLabel(model)}</div>
                  : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="form-control">
                  <span className="label-text text-xs">Width</span>
                  <input className="input input-bordered input-sm" type="number" value={width} onChange={e => setWidth(clampToMultipleOf64(Number(e.target.value), 1024))} />
                </label>
                <label className="form-control">
                  <span className="label-text text-xs">Height</span>
                  <input className="input input-bordered input-sm" type="number" value={height} onChange={e => setHeight(clampToMultipleOf64(Number(e.target.value), 1024))} />
                </label>
                {uiMode !== "simple"
                  ? (
                      <label className="form-control">
                        <span className="label-text text-xs">Steps</span>
                        <input className="input input-bordered input-sm" type="number" value={steps} onChange={e => setSteps(Number(e.target.value) || 1)} />
                      </label>
                    )
                  : null}
                {uiMode !== "simple"
                  ? (
                      <label className="form-control">
                        <span className="label-text text-xs">Scale</span>
                        <input className="input input-bordered input-sm" type="number" value={scale} onChange={e => setScale(Number(e.target.value) || 0)} />
                      </label>
                    )
                  : null}
              </div>

              {uiMode !== "simple"
                ? (
                    <label className="form-control">
                      <span className="label-text text-xs">Sampler</span>
                      <select className="select select-bordered select-sm" value={sampler} onChange={e => setSampler(e.target.value)}>
                        {samplerOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                  )
                : null}

              {uiMode !== "simple" && isNAI4
                ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs">Noise Schedule</span>
                        <select className="select select-bordered select-sm" value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                          {NOISE_SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs">CFG Rescale</span>
                        <input className="input input-bordered input-sm" type="number" value={cfgRescale} onChange={e => setCfgRescale(Number(e.target.value) || 0)} />
                      </label>
                    </div>
                  )
                : null}

              {uiMode !== "simple" && mode === "img2img"
                ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs">Strength</span>
                        <input className="input input-bordered input-sm" type="number" value={strength} step="0.05" min="0" max="1" onChange={e => setStrength(Number(e.target.value) || 0)} />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs">Noise</span>
                        <input className="input input-bordered input-sm" type="number" value={noise} step="0.05" min="0" max="1" onChange={e => setNoise(Number(e.target.value) || 0)} />
                      </label>
                    </div>
                  )
                : null}

              <div className="flex items-center gap-2">
                <label className="form-control w-full">
                  <span className="label-text text-xs">Seed（小于 0 = 随机）</span>
                  <input
                    className="input input-bordered input-sm w-full"
                    type="number"
                    value={seed}
                    onChange={e => setSeed(Number(e.target.value))}
                  />
                </label>
              </div>

              {uiMode !== "simple"
                ? (
                    <label className="label cursor-pointer justify-start gap-3">
                      <input type="checkbox" className="toggle toggle-sm" checked={qualityToggle} onChange={e => setQualityToggle(e.target.checked)} />
                      <span className="label-text">Quality Toggle</span>
                    </label>
                  )
                : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`btn btn-primary ${canGenerate ? "" : "btn-disabled"}`}
              onClick={() => void (uiMode === "simple" ? handleSimpleGenerate() : runGenerate())}
            >
              {loading || simpleConverting ? "生成中..." : (uiMode === "simple" && simpleConverted ? "重新生成" : "生成")}
            </button>
            {result ? <a className="btn" href={result.dataUrl} download={`nai_${result.seed}.png`}>下载</a> : null}
            {result ? <button type="button" className="btn btn-ghost" onClick={() => void handleDeleteCurrentHistory()}>删除当前</button> : null}
            {history.length ? <button type="button" className="btn btn-ghost" onClick={() => void handleClearHistory()}>清空历史</button> : null}
            <div className="ml-auto text-xs opacity-70">{result ? `seed: ${result.seed} · ${result.width}×${result.height}` : ""}</div>
          </div>

          {error ? <div className="text-sm text-error">{error}</div> : null}

          {uiMode === "simple"
            ? (
                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">画风参考</div>
                      <div className="ml-auto flex items-center gap-2">
                        {selectedStyleIds.length
                          ? <div className="text-xs opacity-60">{`已选 ${selectedStyleIds.length} 个`}</div>
                          : <div className="text-xs opacity-60">未选择</div>}
                        <button type="button" className="btn btn-xs" onClick={() => setIsStylePickerOpen(true)}>
                          选择画风
                        </button>
                        {selectedStyleIds.length
                          ? <button type="button" className="btn btn-xs btn-ghost" onClick={handleClearStyles}>清空</button>
                          : null}
                      </div>
                    </div>

                    {selectedStylePresets.length
                      ? (
                          <div className="rounded-box border border-base-300 bg-base-100 divide-y divide-base-300">
                            {selectedStylePresets.map((preset) => {
                              return (
                                <div key={preset.id} className="flex items-center gap-3 p-2">
                                  {preset.imageUrl
                                    ? <img src={preset.imageUrl} className="w-16 h-16 rounded-box object-cover" alt={preset.id} />
                                    : <div className="w-16 h-16 rounded-box bg-base-200 flex items-center justify-center text-xs opacity-60">无图</div>}
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium">{preset.id}</div>
                                    {preset.tags.length
                                      ? <div className="text-xs opacity-60 truncate">{preset.tags.join(", ")}</div>
                                      : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      : (
                          <div className="text-sm opacity-60">
                            未选择画风。请点击右侧“选择画风”添加参考。
                          </div>
                        )}
                  </div>
                </div>
              )
            : null}

          <div className="bg-base-200 rounded-box p-3 flex items-center justify-center min-h-[520px]">
            {result
              ? <img src={result.dataUrl} className="max-h-[720px] w-auto rounded-box" alt="result" />
              : <div className="text-sm opacity-60">暂无图片</div>}
          </div>
        </div>

        <div className="w-[320px] shrink-0 border-l border-base-300 overflow-auto p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="font-medium">历史</div>
            <div className="ml-auto text-xs opacity-60">{history.length ? `共 ${history.length} 条` : ""}</div>
          </div>
          <div className="flex flex-col gap-2">
            {history.map(row => (
              <button
                key={row.id ?? `${row.createdAt}-${row.seed}`}
                type="button"
                className={`flex gap-2 items-center rounded-box border p-2 text-left ${result?.dataUrl === row.dataUrl ? "border-primary" : "border-base-300"}`}
                onClick={() => handleLoadHistory(row)}
              >
                <img src={row.dataUrl} className="w-16 h-16 object-cover rounded-box" alt="history" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs opacity-70">
                    <span>{row.mode}</span>
                    <span> · </span>
                    <span>{row.width}</span>
                    <span>×</span>
                    <span>{row.height}</span>
                  </div>
                  <div className="text-sm truncate">
                    <span>seed: </span>
                    <span>{row.seed}</span>
                  </div>
                  <div className="text-xs opacity-60 truncate">
                    {Array.isArray(row.v4Chars) && row.v4Chars.length ? `${row.prompt} · 角色 ${row.v4Chars.length}` : row.prompt}
                  </div>
                </div>
              </button>
            ))}
            {!history.length ? <div className="text-sm opacity-60">暂无历史</div> : null}
          </div>
        </div>
      </div>

      {/*
      {uiMode === "simple"
        ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-4xl mx-auto flex flex-col gap-4">
                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="text-sm opacity-80">一行自然语言 → 自动转换 tags → 直接出图</div>
                    <input
                      className="input input-bordered w-full"
                      value={simpleText}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSimpleText(next);
                        if (simpleConverted) {
                          setSimpleConverted(null);
                          setSimpleConvertedFromText("");
                          setPrompt("");
                          setNegativePrompt("");
                        }
                      }}
                      placeholder="例如：A girl with silver hair in a rainy cyberpunk street, cinematic lighting"
                    />

                    {simpleError ? <div className="text-sm text-error">{simpleError}</div> : null}
                    {error ? <div className="text-sm text-error">{error}</div> : null}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`btn btn-primary ${canGenerate ? "" : "btn-disabled"}`}
                        onClick={() => void handleSimpleGenerate()}
                      >
                        {loading || simpleConverting ? "处理中..." : (simpleConverted ? "重新生成" : "生成")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setUiMode("pro")}
                        title="切换到 NovelAI 风格的参数面板"
                      >
                        进入专业模式
                      </button>
                    </div>

                    {simpleConverted
                      ? (
                          <div className="grid grid-cols-1 gap-2">
                            <div className="text-xs opacity-70">已转换 tags（可继续编辑后再点“重新生成”）：</div>
                            <textarea
                              className="textarea textarea-bordered w-full min-h-20"
                              value={prompt}
                              onChange={e => setPrompt(e.target.value)}
                            />
                            <details className="collapse bg-base-100">
                              <summary className="collapse-title text-sm">高级：负面 tags（可选）</summary>
                              <div className="collapse-content">
                                <textarea
                                  className="textarea textarea-bordered w-full min-h-20"
                                  value={negativePrompt}
                                  onChange={e => setNegativePrompt(e.target.value)}
                                />
                              </div>
                            </details>
                          </div>
                        )
                      : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card bg-base-200">
                    <div className="card-body gap-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">预览</div>
                        <div className="text-xs opacity-70">
                          {result ? `seed: ${result.seed} · ${result.width}×${result.height}` : ""}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {result
                            ? (
                                <a className="btn btn-sm" href={result.dataUrl} download={`nai_${result.seed}.png`}>下载</a>
                              )
                            : null}
                          {result
                            ? (
                                <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleDeleteCurrentHistory()}>
                                  删除当前
                                </button>
                              )
                            : null}
                          {history.length
                            ? (
                                <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleClearHistory()}>
                                  清空历史
                                </button>
                              )
                            : null}
                        </div>
                      </div>
                      <div className="bg-base-100 rounded-box p-2 min-h-64 flex items-center justify-center">
                        {result
                          ? <img src={result.dataUrl} className="max-h-[480px] w-auto rounded-box" alt="result" />
                          : <div className="text-sm opacity-60">暂无图片</div>}
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body gap-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">历史</div>
                        <div className="ml-auto text-xs opacity-60">{history.length ? `共 ${history.length} 条` : ""}</div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {history.map(row => (
                          <button
                            key={row.id ?? `${row.createdAt}-${row.seed}`}
                            type="button"
                            className={`rounded-box overflow-hidden border ${result?.dataUrl === row.dataUrl ? "border-primary" : "border-base-300"}`}
                            onClick={() => handleLoadHistory(row)}
                            title={`seed ${row.seed}`}
                          >
                            <img src={row.dataUrl} className="w-full h-20 object-cover" alt="history" />
                          </button>
                        ))}
                        {!history.length ? <div className="text-sm opacity-60">暂无历史</div> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex-1 overflow-hidden flex">
              <div className="w-[380px] shrink-0 border-r border-base-300 overflow-auto p-3 flex flex-col gap-3">
                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">模式</div>
                      <div className="ml-auto join">
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${mode === "txt2img" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setMode("txt2img")}
                        >
                          txt2img
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${mode === "img2img" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setMode("img2img")}
                        >
                          img2img
                        </button>
                      </div>
                    </div>

                    {mode === "img2img"
                      ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                                选择源图
                              </button>
                              {result?.dataUrl
                                ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost"
                                      onClick={() => {
                                        setSourceImageDataUrl(result.dataUrl);
                                        setSourceImageBase64(dataUrlToBase64(result.dataUrl));
                                      }}
                                    >
                                      使用当前结果
                                    </button>
                                  )
                                : null}
                            </div>
                            <div className="bg-base-100 rounded-box p-2 min-h-28 flex items-center justify-center">
                              {sourceImageDataUrl
                                ? <img src={sourceImageDataUrl} className="max-h-40 w-auto rounded-box" alt="source" />
                                : <div className="text-sm opacity-60">未选择源图</div>}
                            </div>
                          </div>
                        )
                      : null}
                  </div>
                </div>

                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="font-medium">Prompt</div>
                    <textarea className="textarea textarea-bordered w-full min-h-28" value={prompt} onChange={e => setPrompt(e.target.value)} />
                    <div className="font-medium">Negative</div>
                    <textarea className="textarea textarea-bordered w-full min-h-24" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} />
                  </div>
                </div>

                <div className="card bg-base-200">
                  <div className="card-body gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">参数</div>
                      <div className="ml-auto text-xs opacity-70">{modelLabel(model)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs">Width</span>
                        <input className="input input-bordered input-sm" type="number" value={width} onChange={e => setWidth(clampToMultipleOf64(Number(e.target.value), 1024))} />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs">Height</span>
                        <input className="input input-bordered input-sm" type="number" value={height} onChange={e => setHeight(clampToMultipleOf64(Number(e.target.value), 1024))} />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs">Steps</span>
                        <input className="input input-bordered input-sm" type="number" value={steps} onChange={e => setSteps(Number(e.target.value) || 1)} />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs">Scale</span>
                        <input className="input input-bordered input-sm" type="number" value={scale} onChange={e => setScale(Number(e.target.value) || 0)} />
                      </label>
                    </div>

                    <label className="form-control">
                      <span className="label-text text-xs">Sampler</span>
                      <select className="select select-bordered select-sm" value={sampler} onChange={e => setSampler(e.target.value)}>
                        {samplerOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>

                    {isNAI4
                      ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="form-control">
                              <span className="label-text text-xs">Noise Schedule</span>
                              <select className="select select-bordered select-sm" value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                                {NOISE_SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </label>
                            <label className="form-control">
                              <span className="label-text text-xs">CFG Rescale</span>
                              <input className="input input-bordered input-sm" type="number" value={cfgRescale} onChange={e => setCfgRescale(Number(e.target.value) || 0)} />
                            </label>
                          </div>
                        )
                      : null}

                    {mode === "img2img"
                      ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="form-control">
                              <span className="label-text text-xs">Strength</span>
                              <input className="input input-bordered input-sm" type="number" value={strength} step="0.05" min="0" max="1" onChange={e => setStrength(Number(e.target.value) || 0)} />
                            </label>
                            <label className="form-control">
                              <span className="label-text text-xs">Noise</span>
                              <input className="input input-bordered input-sm" type="number" value={noise} step="0.05" min="0" max="1" onChange={e => setNoise(Number(e.target.value) || 0)} />
                            </label>
                          </div>
                        )
                      : null}

                    <div className="flex items-center gap-2">
                      <div className="join">
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${seedMode === "random" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setSeedMode("random")}
                        >
                          随机 Seed
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm join-item ${seedMode === "fixed" ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setSeedMode("fixed")}
                        >
                          固定 Seed
                        </button>
                      </div>
                      {seedMode === "fixed"
                        ? <input className="input input-bordered input-sm w-40" type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} />
                        : <div className="text-xs opacity-70">将自动生成</div>}
                    </div>

                    <label className="label cursor-pointer justify-start gap-3">
                      <input type="checkbox" className="toggle toggle-sm" checked={qualityToggle} onChange={e => setQualityToggle(e.target.checked)} />
                      <span className="label-text">Quality Toggle</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`btn btn-primary ${canGenerate ? "" : "btn-disabled"}`}
                    onClick={() => void runGenerate()}
                  >
                    {loading ? "生成中..." : "生成"}
                  </button>
                  {result ? <a className="btn" href={result.dataUrl} download={`nai_${result.seed}.png`}>下载</a> : null}
                  {result ? <button type="button" className="btn btn-ghost" onClick={() => void handleDeleteCurrentHistory()}>删除当前</button> : null}
                  {history.length ? <button type="button" className="btn btn-ghost" onClick={() => void handleClearHistory()}>清空历史</button> : null}
                  <div className="ml-auto text-xs opacity-70">{result ? `seed: ${result.seed} · ${result.width}×${result.height}` : ""}</div>
                </div>

                {error ? <div className="text-sm text-error">{error}</div> : null}

                <div className="bg-base-200 rounded-box p-3 flex items-center justify-center min-h-[520px]">
                  {result
                    ? <img src={result.dataUrl} className="max-h-[720px] w-auto rounded-box" alt="result" />
                    : <div className="text-sm opacity-60">暂无图片</div>}
                </div>
              </div>

              <div className="w-[320px] shrink-0 border-l border-base-300 overflow-auto p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-medium">历史</div>
                  <div className="ml-auto text-xs opacity-60">{history.length ? `共 ${history.length} 条` : ""}</div>
                </div>
                <div className="flex flex-col gap-2">
                  {history.map(row => (
                    <button
                      key={row.id ?? `${row.createdAt}-${row.seed}`}
                      type="button"
                      className={`flex gap-2 items-center rounded-box border p-2 text-left ${result?.dataUrl === row.dataUrl ? "border-primary" : "border-base-300"}`}
                      onClick={() => handleLoadHistory(row)}
                    >
                      <img src={row.dataUrl} className="w-16 h-16 object-cover rounded-box" alt="history" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs opacity-70">
                          <span>{row.mode}</span>
                          <span> · </span>
                          <span>{row.width}</span>
                          <span>×</span>
                          <span>{row.height}</span>
                        </div>
                        <div className="text-sm truncate">
                          <span>seed: </span>
                          <span>{row.seed}</span>
                        </div>
                        <div className="text-xs opacity-60 truncate">{row.prompt}</div>
                      </div>
                    </button>
                  ))}
                  {!history.length ? <div className="text-sm opacity-60">暂无历史</div> : null}
                </div>
              </div>
            </div>
          )}
      */}

      <dialog className={`modal ${isSettingsOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-bold text-lg">连接设置</h3>
            <div className="ml-auto text-xs opacity-70">
              {modelLabel(model)}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">请求方式</div>
              <div className="ml-auto join">
                <button
                  type="button"
                  className={`btn btn-sm join-item ${requestMode === "proxy" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRequestMode("proxy")}
                  title="通过本地后端代理请求（推荐，避免浏览器 CORS）"
                >
                  代理
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item ${requestMode === "direct" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRequestMode("direct")}
                  title="浏览器直连 NovelAI（可能被 CORS 拦截；Electron 里通常可用）"
                >
                  直连
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">NovelAI Token（Bearer）</span></label>
                <input
                  className="input input-bordered"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="pst-... 或其它 token"
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Endpoint</span></label>
                <div className="join">
                  <input
                    className="input input-bordered join-item w-full"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn join-item"
                    onClick={() => setEndpoint(DEFAULT_IMAGE_ENDPOINT)}
                    title="重置为默认"
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs opacity-70">
              {requestMode === "direct" && !isElectronEnv()
                ? "提示：浏览器直连通常会遇到 CORS，建议切换到“代理”。"
                : "提示：Token 仅保存在本地 localStorage。"}
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setIsSettingsOpen(false)}>
              关闭
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setIsSettingsOpen(false)}>close</button>
        </form>
      </dialog>

      <dialog className={`modal ${isStylePickerOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-5xl">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-bold text-lg">选择画风</h3>
            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs opacity-70">{selectedStyleIds.length ? `已选 ${selectedStyleIds.length} 个` : ""}</div>
              {selectedStyleIds.length
                ? <button type="button" className="btn btn-sm btn-ghost" onClick={handleClearStyles}>清空</button>
                : null}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stylePresets.map((preset) => {
              const selected = selectedStyleIds.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rounded-box border p-2 text-left flex flex-col gap-2 ${selected ? "border-primary" : "border-base-300"}`}
                  onClick={() => handleToggleStyle(preset.id)}
                  title={preset.tags.length ? preset.tags.join(", ") : preset.title}
                >
                  <div className="w-full aspect-video rounded-box bg-base-200 overflow-hidden flex items-center justify-center">
                    {preset.imageUrl
                      ? <img src={preset.imageUrl} alt={preset.title} className="w-full h-full object-cover" />
                      : <div className="text-xs opacity-60">{preset.title}</div>}
                  </div>
                  <div className="text-sm font-medium truncate">{preset.title}</div>
                  <div className="text-xs opacity-60 truncate">
                    {preset.tags.length ? preset.tags.join(", ") : "（未配置 tags）"}
                  </div>
                </button>
              );
            })}
            {!stylePresets.length
              ? (
                  <div className="text-sm opacity-60">
                    暂无画风。请在 app/assets/ai-image/styles/ 下放图片（例如 oil-painting.webp），并在 app/utils/aiImageStylePresets.ts 配置对应 tags。
                  </div>
                )
              : null}
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setIsStylePickerOpen(false)}>
              关闭
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setIsStylePickerOpen(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
