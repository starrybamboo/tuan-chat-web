// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互，并复用仓库内 `api/novelai` 的请求类型作为 SSOT。
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import { unzipSync } from "fflate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addAiImageHistory,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import { isElectronEnv } from "@/utils/isElectronEnv";
import { AiGenerateImageRequest } from "../../api/novelai/models/AiGenerateImageRequest";

type TabKey = "prompt" | "undesired" | "image" | "history" | "connection";

const DEFAULT_IMAGE_ENDPOINT = "https://image.novelai.net";
const FALLBACK_META_ENDPOINT = "https://api.novelai.net";

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

function normalizeEndpoint(input: string) {
  const value = String(input || "").trim();
  if (!value)
    return "";
  return value.replace(/\/+$/, "");
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

function extractModelStrings(input: unknown) {
  const results = new Set<string>();
  const visited = new Set<any>();
  const stack: unknown[] = [input];
  const isModelString = (value: string) => {
    const v = value.trim();
    if (!v || v.length > 120)
      return false;
    return /nai-diffusion|safe-diffusion|furry-diffusion|kandinsky/i.test(v);
  };

  let steps = 0;
  while (stack.length && steps < 10_000) {
    steps++;
    const cur = stack.pop();
    if (!cur)
      continue;

    if (typeof cur === "string") {
      if (isModelString(cur))
        results.add(cur.trim());
      continue;
    }

    if (typeof cur !== "object")
      continue;

    if (visited.has(cur))
      continue;
    visited.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur)
        stack.push(item);
      continue;
    }

    for (const value of Object.values(cur as Record<string, unknown>))
      stack.push(value);
  }

  return [...results];
}

function buildFallbackModelList() {
  const fromOpenapi = Object.values(AiGenerateImageRequest.model) as string[];
  const candidates = [
    ...fromOpenapi,
    "nai-diffusion-4-full",
    "nai-diffusion-4-curated-preview",
  ];
  return [...new Set(candidates)].filter(Boolean);
}

function modelLabel(value: string) {
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

async function novelApiFetchJson(args: { token: string; endpoint: string; path: string }) {
  const endpointHeader = normalizeEndpoint(args.endpoint);
  const res = await fetch(`/api/novelapi${args.path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${args.token}`,
      "Accept": "application/json",
      "X-NovelAPI-Endpoint": endpointHeader,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("application/json"))
    return await res.json();

  const text = await res.text();
  try {
    return JSON.parse(text);
  }
  catch {
    return text;
  }
}

async function loadModelsRuntime(args: { token: string; imageEndpoint: string }) {
  const token = String(args.token || "").trim();
  if (!token) {
    return {
      models: buildFallbackModelList(),
      source: "fallback" as const,
      hint: "缺少 token，已使用降级模型列表",
    };
  }

  const isElectron = isElectronEnv() && typeof window.electronAPI?.novelaiGetClientSettings === "function";
  if (isElectron) {
    const imageEndpoint = normalizeEndpoint(args.imageEndpoint) || DEFAULT_IMAGE_ENDPOINT;
    const payload = { token, endpoint: imageEndpoint };
    const settings = await window.electronAPI.novelaiGetClientSettings(payload);
    const models = extractModelStrings(settings);
    if (models.length > 0) {
      return { models, source: "runtime" as const, hint: "" };
    }
    return {
      models: buildFallbackModelList(),
      source: "fallback" as const,
      hint: "未能从上游提取模型列表，已使用降级模型列表",
    };
  }

  const endpoints = [
    normalizeEndpoint(args.imageEndpoint) || DEFAULT_IMAGE_ENDPOINT,
    FALLBACK_META_ENDPOINT,
  ];

  for (const endpoint of endpoints) {
    try {
      const settings = await novelApiFetchJson({ token, endpoint, path: "/user/clientsettings" });
      const models = extractModelStrings(settings);
      if (models.length > 0)
        return { models, source: "runtime" as const, hint: "" };
    }
    catch {
      // ignore and fallback
    }

    try {
      const userData = await novelApiFetchJson({ token, endpoint, path: "/user/data" });
      const models = extractModelStrings(userData);
      if (models.length > 0)
        return { models, source: "runtime" as const, hint: "" };
    }
    catch {
      // ignore and fallback
    }
  }

  return {
    models: buildFallbackModelList(),
    source: "fallback" as const,
    hint: "未能从上游提取模型列表，已使用降级模型列表",
  };
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
  const model = String(args.model || "nai-diffusion-3");

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = model === "nai-diffusion-4-curated-preview" || model === "nai-diffusion-4-full";

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
    parameters.strength = strength;
    parameters.noise = noise;
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.legacy = false;
    parameters.legacy_v3_extend = false;
    parameters.noise_schedule = args.noiseSchedule;

    if (isNAI4) {
      const cfgRescale = Number.isFinite(args.cfgRescale) ? Number(args.cfgRescale) : 0;

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
      parameters.use_coords = false;
      parameters.v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: [],
        },
        use_coords: parameters.use_coords,
        use_order: true,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: negativePrompt,
          char_captions: [],
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
    model: model as unknown as AiGenerateImageRequest.model,
    input: prompt,
    action: (args.mode === "img2img" ? "img2img" : "generate") as AiGenerateImageRequest.action,
    parameters,
  };

  const res = await fetch("/api/novelapi/ai/generate-image", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/octet-stream",
      "X-NovelAPI-Endpoint": endpoint,
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

function LeftTabButton(props: { tab: TabKey; active: TabKey; onChange: (tab: TabKey) => void; children: string }) {
  return (
    <button
      type="button"
      className={`btn btn-sm join-item flex-1 ${props.active === props.tab ? "btn-primary" : "btn-ghost"}`}
      onClick={() => props.onChange(props.tab)}
    >
      {props.children}
    </button>
  );
}

export default function AiImagePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("prompt");

  const [token, setToken] = useState("");
  const [endpoint, setEndpoint] = useState(DEFAULT_IMAGE_ENDPOINT);

  const [mode, setMode] = useState<AiImageHistoryMode>("txt2img");
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState("");
  const [sourceImageBase64, setSourceImageBase64] = useState("");

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [models, setModels] = useState<string[]>(() => buildFallbackModelList());
  const [modelsHint, setModelsHint] = useState<string>("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [model, setModel] = useState<string>(() => buildFallbackModelList()[0] || "nai-diffusion-3");

  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [scale, setScale] = useState(5);
  const [sampler, setSampler] = useState("k_euler_a");
  const [noiseSchedule, setNoiseSchedule] = useState("karras");
  const [cfgRescale, setCfgRescale] = useState(0);
  const [smea, setSmea] = useState(false);
  const [smeaDyn, setSmeaDyn] = useState(false);
  const [qualityToggle, setQualityToggle] = useState(false);
  const [strength, setStrength] = useState(0.7);
  const [noise, setNoise] = useState(0.2);

  const [seedMode, setSeedMode] = useState<"random" | "fixed">("random");
  const [seed, setSeed] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ dataUrl: string; seed: number; width: number; height: number; model: string } | null>(null);

  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = model === "nai-diffusion-4-curated-preview" || model === "nai-diffusion-4-full";

  const samplerOptions = useMemo(() => {
    if (isNAI4)
      return SAMPLERS_NAI4;
    if (isNAI3)
      return SAMPLERS_NAI3;
    return SAMPLERS_BASE;
  }, [isNAI3, isNAI4]);

  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    await refreshHistory();
  }, [refreshHistory]);

  const handleDeleteCurrentHistory = useCallback(async () => {
    const selectedDataUrl = result?.dataUrl;
    if (!selectedDataUrl)
      return;

    const row = history.find(h => h.dataUrl === selectedDataUrl);
    if (!row || typeof row.id !== "number")
      return;

    await deleteAiImageHistory(row.id as number);
    await refreshHistory();
  }, [history, refreshHistory, result]);

  const handlePickFile = useCallback(async (file: File) => {
    const bytes = await readFileAsBytes(file);
    const dataUrl = detectBinaryDataUrl(bytes) || base64DataUrl(file.type || "image/png", bytes);
    const size = await readImageSize(dataUrl).catch(() => ({ width: 0, height: 0 }));
    setMode("img2img");
    setSourceImageDataUrl(dataUrl);
    setSourceImageBase64(bytesToBase64(bytes));

    if (size.width && size.height) {
      setWidth(clampToMultipleOf64(size.width, 1024));
      setHeight(clampToMultipleOf64(size.height, 1024));
    }

    setActiveTab("image");
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const tokenValue = token.trim();
      if (!tokenValue)
        throw new Error("请先填写 token");

      const promptValue = prompt.trim();
      if (!promptValue)
        throw new Error("请先填写 prompt");

      if (mode === "img2img" && !sourceImageBase64.trim())
        throw new Error("img2img 需要上传源图片（拖拽到右侧预览区也可以）");

      const endpointValue = normalizeEndpoint(endpoint) || DEFAULT_IMAGE_ENDPOINT;
      const seedValue = seedMode === "fixed" ? seed : undefined;

      const useIpc = isElectronEnv() && typeof window.electronAPI?.novelaiGenerateImage === "function";

      let res: { dataUrl: string; seed: number; width: number; height: number; model: string };
      if (useIpc) {
        res = await window.electronAPI.novelaiGenerateImage({
          token: tokenValue,
          endpoint: endpointValue,
          mode,
          sourceImageBase64: mode === "img2img" ? sourceImageBase64 : undefined,
          prompt: promptValue,
          negativePrompt,
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
          strength,
          noise,
          seed: seedValue,
        });
      }
      else {
        res = await generateNovelImageViaProxy({
          token: tokenValue,
          endpoint: endpointValue,
          mode,
          sourceImageBase64: mode === "img2img" ? sourceImageBase64 : undefined,
          strength,
          noise,
          prompt: promptValue,
          negativePrompt,
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
      }

      setResult(res);
      await addAiImageHistory({
        createdAt: Date.now(),
        mode,
        model: res.model,
        seed: res.seed,
        width: res.width,
        height: res.height,
        prompt: promptValue,
        negativePrompt,
        dataUrl: res.dataUrl,
        sourceDataUrl: mode === "img2img" ? (sourceImageDataUrl || undefined) : undefined,
      }, { maxItems: 30 });

      await refreshHistory();
      setActiveTab("history");
    }
    catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
    negativePrompt,
    noise,
    noiseSchedule,
    prompt,
    qualityToggle,
    refreshHistory,
    sampler,
    scale,
    seed,
    seedMode,
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    steps,
    strength,
    token,
    width,
  ]);

  const refreshModels = useCallback(async () => {
    try {
      setModelsLoading(true);
      setModelsHint("");

      const res = await loadModelsRuntime({ token, imageEndpoint: endpoint });
      const next = [...new Set(res.models)].filter(Boolean);
      next.sort((a, b) => a.localeCompare(b));

      setModels(next);
      setModelsHint(res.hint);

      if (!next.includes(model)) {
        const fallback = next[0] || buildFallbackModelList()[0] || model;
        setModel(fallback);
      }
    }
    finally {
      setModelsLoading(false);
    }
  }, [endpoint, model, token]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    void refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.key === "Enter"))
        return;
      e.preventDefault();
      if (!loading)
        void handleGenerate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleGenerate, loading]);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xl font-semibold">AI 生图（NovelAI）</div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => void refreshModels()} disabled={modelsLoading}>
            {modelsLoading ? "模型加载中..." : "刷新模型"}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void handleGenerate()} disabled={loading}>
            {loading ? "生成中..." : "生成 (Ctrl+Enter)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-4">
        <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
          <div className="card-body p-3 gap-3">
            <div className="join w-full">
              <LeftTabButton tab="prompt" active={activeTab} onChange={setActiveTab}>Prompt</LeftTabButton>
              <LeftTabButton tab="undesired" active={activeTab} onChange={setActiveTab}>Undesired</LeftTabButton>
              <LeftTabButton tab="image" active={activeTab} onChange={setActiveTab}>Image</LeftTabButton>
              <LeftTabButton tab="history" active={activeTab} onChange={setActiveTab}>History</LeftTabButton>
              <LeftTabButton tab="connection" active={activeTab} onChange={setActiveTab}>Connection</LeftTabButton>
            </div>

            {activeTab === "prompt" && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold">Prompt</div>
                <textarea
                  className="textarea textarea-bordered w-full min-h-44"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="写下你想要的画面描述..."
                />
                <div className="text-xs opacity-60">
                  快捷键：`Ctrl+Enter` 生成；拖拽图片到右侧预览区进入 img2img。
                </div>
              </div>
            )}

            {activeTab === "undesired" && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold">Undesired Content</div>
                <textarea
                  className="textarea textarea-bordered w-full min-h-44"
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="不希望出现的内容（negative prompt）..."
                />
              </div>
            )}

            {activeTab === "image" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Image</div>
                  <div className="flex items-center gap-2">
                    <div className="badge badge-outline">{mode}</div>
                    {modelsHint && <div className="badge badge-warning badge-outline">模型降级</div>}
                  </div>
                </div>

                {modelsHint && (
                  <div className="alert alert-warning py-2">
                    <span className="text-xs">{modelsHint}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === "txt2img" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setMode("txt2img")}
                    disabled={loading}
                  >
                    txt2img
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === "img2img" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setMode("img2img")}
                    disabled={loading}
                  >
                    img2img
                  </button>
                </div>

                {mode === "img2img" && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs opacity-70">源图片（可拖拽到右侧预览区）</div>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file)
                          return;
                        void handlePickFile(file);
                      }}
                    />
                    {sourceImageDataUrl && (
                      <div className="w-full overflow-hidden rounded-md border border-base-200 bg-base-200">
                        <img
                          src={sourceImageDataUrl}
                          alt="source"
                          className="w-full h-auto block max-h-40 object-contain bg-base-200"
                          draggable={false}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">strength</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={strength}
                          min={0}
                          max={1}
                          step={0.05}
                          onChange={e => setStrength(Number(e.target.value))}
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">noise</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={noise}
                          min={0}
                          max={1}
                          step={0.05}
                          onChange={e => setNoise(Number(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <label className="form-control">
                  <div className="label py-1">
                    <span className="label-text text-sm">模型</span>
                  </div>
                  <select className="select select-bordered" value={model} onChange={e => setModel(e.target.value)}>
                    {models.map(value => (
                      <option key={value} value={value}>
                        {`${modelLabel(value)} (${value})`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="form-control">
                    <span className="label-text text-xs opacity-70">宽</span>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={width}
                      onChange={e => setWidth(clampToMultipleOf64(Number(e.target.value), 1024))}
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text text-xs opacity-70">高</span>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={height}
                      onChange={e => setHeight(clampToMultipleOf64(Number(e.target.value), 1024))}
                    />
                  </label>
                </div>

                <details className="collapse collapse-arrow border border-base-200 bg-base-200/40" open>
                  <summary className="collapse-title text-sm font-semibold py-3">常用参数</summary>
                  <div className="collapse-content">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">steps</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={steps}
                          onChange={e => setSteps(Number(e.target.value))}
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">scale</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={scale}
                          step={0.5}
                          onChange={e => setScale(Number(e.target.value))}
                        />
                      </label>
                    </div>

                    <label className="form-control mt-2">
                      <span className="label-text text-xs opacity-70">sampler</span>
                      <select className="select select-bordered select-sm" value={sampler} onChange={e => setSampler(e.target.value)}>
                        {samplerOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>

                    <label className="form-control mt-2">
                      <span className="label-text text-xs opacity-70">noise_schedule</span>
                      <select className="select select-bordered select-sm" value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                        {NOISE_SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">seed</span>
                        <div className="join w-full">
                          <button
                            type="button"
                            className={`btn btn-sm join-item flex-1 ${seedMode === "random" ? "btn-primary" : "btn-outline"}`}
                            onClick={() => setSeedMode("random")}
                          >
                            随机
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm join-item flex-1 ${seedMode === "fixed" ? "btn-primary" : "btn-outline"}`}
                            onClick={() => setSeedMode("fixed")}
                          >
                            固定
                          </button>
                        </div>
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">固定 seed</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={seed}
                          disabled={seedMode !== "fixed"}
                          onChange={e => setSeed(Number(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>
                </details>

                <details className="collapse collapse-arrow border border-base-200 bg-base-200/40">
                  <summary className="collapse-title text-sm font-semibold py-3">高级设置</summary>
                  <div className="collapse-content">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-control">
                        <span className="label-text text-xs opacity-70">cfg_rescale (v4)</span>
                        <input
                          type="number"
                          className="input input-bordered input-sm"
                          value={cfgRescale}
                          step={0.1}
                          onChange={e => setCfgRescale(Number(e.target.value))}
                        />
                      </label>
                      <div className="flex flex-col gap-1 pt-1">
                        <label className="label cursor-pointer justify-start gap-3 py-1">
                          <input type="checkbox" className="checkbox checkbox-sm" checked={qualityToggle} onChange={e => setQualityToggle(e.target.checked)} />
                          <span className="label-text text-sm">quality</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-3 py-1">
                          <input type="checkbox" className="checkbox checkbox-sm" checked={smea} onChange={e => setSmea(e.target.checked)} />
                          <span className="label-text text-sm">smea (v3)</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-3 py-1">
                          <input type="checkbox" className="checkbox checkbox-sm" checked={smeaDyn} onChange={e => setSmeaDyn(e.target.checked)} />
                          <span className="label-text text-sm">smea_dyn (v3)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}
            {activeTab === "history" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">历史（本地）</div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-xs btn-outline" onClick={() => void refreshHistory()} disabled={loading}>刷新</button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline btn-error"
                      onClick={() => void handleClearHistory()}
                      disabled={loading || history.length === 0}
                    >
                      清空
                    </button>
                  </div>
                </div>

                {history.length === 0 && <div className="text-sm opacity-60">暂无历史记录</div>}

                {history.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {history.map((item) => {
                      const selected = item.dataUrl === result?.dataUrl;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`aspect-square overflow-hidden rounded-md border ${selected ? "border-primary" : "border-base-200"} bg-base-200`}
                          onClick={() => {
                            setResult({ dataUrl: item.dataUrl, seed: item.seed, width: item.width, height: item.height, model: item.model });
                            setMode(item.mode);
                            setModel(item.model);
                            setWidth(item.width);
                            setHeight(item.height);
                            setSeedMode("fixed");
                            setSeed(item.seed);
                            setPrompt(item.prompt);
                            setNegativePrompt(item.negativePrompt);
                            setSourceImageDataUrl(item.sourceDataUrl || "");
                          }}
                        >
                          <img src={item.dataUrl} alt="history" className="w-full h-full object-cover" draggable={false} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs opacity-60">点击缩略图可回填参数</div>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline btn-error"
                      disabled={!result?.dataUrl || history.length === 0}
                      onClick={() => void handleDeleteCurrentHistory()}
                    >
                      删除当前
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "connection" && (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold">Connection</div>

                <label className="form-control">
                  <span className="label-text text-sm">Endpoint</span>
                  <input
                    className="input input-bordered"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder={DEFAULT_IMAGE_ENDPOINT}
                  />
                </label>

                <label className="form-control">
                  <span className="label-text text-sm">Token</span>
                  <input
                    className="input input-bordered"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Persistent API token..."
                  />
                  <span className="label-text-alt opacity-60 mt-1">token 仅保存在内存，不会写入本地存储</span>
                </label>

                <div className="text-xs opacity-60 leading-relaxed">
                  Web 环境默认通过同源代理 `/api/novelapi/*` 请求 NovelAI；Electron 环境默认通过 IPC 代理请求。
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
          <div className="card-body p-4 gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file)
                  return;
                void handlePickFile(file);
              }}
            />

            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">预览</div>
              <div className="text-xs opacity-60">
                {result ? `seed=${result.seed} · ${result.width}×${result.height} · ${result.model}` : "暂无结果"}
              </div>
            </div>

            <div
              className="relative w-full min-h-[520px] overflow-hidden rounded-xl border border-base-200 bg-base-200 flex items-center justify-center"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (!file)
                  return;
                if (!file.type.startsWith("image/"))
                  return;
                void handlePickFile(file);
              }}
              onDoubleClick={() => {
                if (mode === "img2img")
                  fileInputRef.current?.click();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (mode === "img2img")
                    fileInputRef.current?.click();
                }
              }}
            >
              {result?.dataUrl
                ? (
                    <img
                      src={result.dataUrl}
                      alt="result"
                      className="max-h-[520px] w-auto max-w-full object-contain"
                      draggable={false}
                    />
                  )
                : (
                    <div className="text-sm opacity-60 text-center px-6">
                      <div className="font-semibold opacity-80 mb-1">拖拽图片到此处</div>
                      <div>自动进入 img2img，并载入源图</div>
                    </div>
                  )}
            </div>

            {!!error && (
              <div className="alert alert-error py-2">
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs opacity-60">
                {mode === "img2img" && sourceImageDataUrl
                  ? "img2img：已载入源图（双击预览区可替换）"
                  : "txt2img"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={loading}
                  onClick={() => {
                    setResult(null);
                    setError("");
                  }}
                >
                  清空预览
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void handleGenerate()} disabled={loading}>
                  {loading ? "生成中..." : "生成"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
