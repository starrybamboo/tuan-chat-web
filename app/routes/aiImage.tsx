import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import { unzipSync } from "fflate";
import { useEffect, useMemo, useState } from "react";
import {
  addAiImageHistory,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import { isElectronEnv } from "@/utils/isElectronEnv";

interface ModelOption {
  label: string;
  value: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { label: "NAI v3 (nai-diffusion-3)", value: "nai-diffusion-3" },
  { label: "NAI v4 Full (nai-diffusion-4-full)", value: "nai-diffusion-4-full" },
  { label: "NAI v4 Curated Preview (nai-diffusion-4-curated-preview)", value: "nai-diffusion-4-curated-preview" },
  { label: "NAI (nai-diffusion)", value: "nai-diffusion" },
  { label: "NAI Furry (nai-diffusion-furry)", value: "nai-diffusion-furry" },
  { label: "Safe Diffusion (safe-diffusion)", value: "safe-diffusion" },
];

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

function firstImageFromZip(zipBytes: Uint8Array) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names.find(n => /\.(?:png|webp|jpe?g)$/i.test(n)) || names[0];
  return base64DataUrl(mimeFromFilename(preferred), files[preferred]);
}

function startsWithBytes(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length)
    return false;
  return prefix.every((b, i) => bytes[i] === b);
}

function looksLikeZip(bytes: Uint8Array) {
  // ZIP local file header: PK 03 04
  // ZIP empty archive: PK 05 06
  // ZIP spanned archive: PK 07 08
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

  // RIFF....WEBP
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

function roundToMultipleOf64(value: number) {
  return Math.max(64, Math.round(value / 64) * 64);
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

async function generateNovelAiViaProxy(args: {
  token: string;
  endpoint: string;
  mode: AiImageHistoryMode;
  sourceImageBase64?: string;
  sourceImageDataUrl?: string;
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
  const requestUrl = "/api/novelapi/ai/generate-image";

  const isNAI3 = args.model === "nai-diffusion-3";
  const isNAI4 = args.model === "nai-diffusion-4-curated-preview" || args.model === "nai-diffusion-4-full";
  const resolvedSampler = args.sampler === "k_euler_a" ? "k_euler_ancestral" : args.sampler;
  const actualSeed = Number.isFinite(args.seed) ? (args.seed as number) : Math.floor(Math.random() * 2 ** 32);

  const parameters: Record<string, unknown> = {
    seed: actualSeed,
    width: args.width,
    height: args.height,
    n_samples: 1,
    steps: args.steps,
    scale: args.scale,
    sampler: resolvedSampler,
    negative_prompt: args.negativePrompt,
    ucPreset: 2,
    qualityToggle: args.qualityToggle,
  };

  if (args.mode === "img2img") {
    if (!args.sourceImageBase64) {
      throw new Error("img2img 需要上传源图片");
    }
    parameters.image = args.sourceImageBase64;
    parameters.noise = args.noise;
    parameters.strength = args.strength;
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.legacy = false;
    parameters.legacy_v3_extend = false;
    parameters.noise_schedule = args.noiseSchedule;

    if (isNAI4) {
      parameters.add_original_image = true;
      parameters.cfg_rescale = args.cfgRescale;
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
          base_caption: args.prompt,
          char_captions: [],
        },
        use_coords: parameters.use_coords,
        use_order: true,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: args.negativePrompt,
          char_captions: [],
        },
      };
    }
    else if (isNAI3) {
      parameters.sm_dyn = args.smeaDyn;
      parameters.sm = args.smea || args.smeaDyn;

      // Align with novelai-bot behavior for NAI v3.
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
      if (typeof parameters.scale === "number" && (parameters.scale as number) > 10) {
        parameters.scale = (parameters.scale as number) / 2;
      }
    }
  }

  const payload = {
    model: args.model,
    input: args.prompt,
    action: "generate",
    parameters,
  };

  const resp = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.token}`,
      "Content-Type": "application/json",
      "x-novelapi-endpoint": args.endpoint,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`NovelAI 请求失败：${resp.status} ${resp.statusText}${text ? ` - ${text.slice(0, 300)}` : ""}`);
  }

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  const disposition = (resp.headers.get("content-disposition") || "").toLowerCase();
  const buffer = new Uint8Array(await resp.arrayBuffer());
  const isZip = contentType.includes("zip") || disposition.includes(".zip") || looksLikeZip(buffer);

  let dataUrl = detectBinaryDataUrl(buffer);
  if (isZip) {
    dataUrl = firstImageFromZip(buffer);
  }
  else if (contentType.startsWith("image/")) {
    dataUrl = base64DataUrl(contentType.split(";")[0] || "image/png", buffer);
  }
  else if (!dataUrl) {
    // Some environments might hide/override headers (e.g. octet-stream). Try to parse as text event-stream.
    try {
      const text = new TextDecoder().decode(buffer);
      const maybeDataUrl = /data:\s*(data:\S+;base64,[A-Za-z0-9+/=]+)/.exec(text)?.[1];
      if (maybeDataUrl) {
        dataUrl = maybeDataUrl;
      }
      else {
        const maybeBase64 = /data:\s*([A-Za-z0-9+/=]+)\s*$/m.exec(text)?.[1];
        if (maybeBase64) {
          dataUrl = `data:image/png;base64,${maybeBase64}`;
        }
      }
    }
    catch {
      // ignore
    }
  }

  if (!dataUrl) {
    throw new Error(`NovelAI 返回了未知格式：content-type=${contentType || "unknown"}`);
  }

  return {
    dataUrl,
    seed: actualSeed,
    width: args.width,
    height: args.height,
    model: args.model,
  };
}

export default function AiImageRoute() {
  const [token, setToken] = useState("");
  const [endpoint, setEndpoint] = useState("https://image.novelai.net");
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [mode, setMode] = useState<AiImageHistoryMode>("txt2img");
  const [sidebarTab, setSidebarTab] = useState<"prompt" | "undesired" | "image" | "connection" | "history">("prompt");

  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string>("");
  const [sourceImageBase64, setSourceImageBase64] = useState<string>("");

  const [prompt, setPrompt] = useState("best quality, amazing quality, very aesthetic, absurdres, 1girl");
  const [negativePrompt, setNegativePrompt] = useState("nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark");

  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [scale, setScale] = useState(5);
  const [sampler, setSampler] = useState<string>("k_euler_a");
  const [noiseSchedule, setNoiseSchedule] = useState<string>("karras");
  const [cfgRescale, setCfgRescale] = useState(0);
  const [smea, setSmea] = useState(false);
  const [smeaDyn, setSmeaDyn] = useState(false);
  const [qualityToggle, setQualityToggle] = useState(false);

  const [strength, setStrength] = useState(0.7);
  const [noise, setNoise] = useState(0.2);
  const [seed, setSeed] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envHint, setEnvHint] = useState<string | null>(null);
  const [result, setResult] = useState<null | { dataUrl: string; seed: number; width: number; height: number; model: string }>(null);

  const [autoSaveHistory, setAutoSaveHistory] = useState(true);
  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = model === "nai-diffusion-4-curated-preview" || model === "nai-diffusion-4-full";

  const samplerOptions = useMemo(() => {
    if (isNAI4)
      return [...SAMPLERS_NAI4];
    if (isNAI3)
      return [...SAMPLERS_NAI3];
    return [...SAMPLERS_BASE];
  }, [isNAI3, isNAI4]);

  const resultMetaText = useMemo(() => {
    if (!result)
      return "";
    return `seed=${result.seed} · ${result.width}×${result.height} · ${result.model}`;
  }, [result]);

  async function refreshHistory() {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  useEffect(() => {
    async function run() {
      if (!sourceImageFile) {
        setSourceImageDataUrl("");
        setSourceImageBase64("");
        return;
      }

      const bytes = await readFileAsBytes(sourceImageFile);
      const preview = base64DataUrl(sourceImageFile.type || "image/png", bytes);
      setSourceImageDataUrl(preview);
      setSourceImageBase64(bytesToBase64(bytes));

      try {
        const size = await readImageSize(preview);
        setWidth(roundToMultipleOf64(size.width));
        setHeight(roundToMultipleOf64(size.height));
      }
      catch {
        // ignore
      }
    }

    void run();
  }, [sourceImageFile]);

  async function onGenerate() {
    setError(null);
    setEnvHint(null);
    setLoading(true);
    try {
      if (!token.trim()) {
        throw new Error("请先填写 NovelAI token（Bearer）");
      }

      const seedValue = seed.trim() ? Number(seed) : undefined;
      if (seed.trim() && !Number.isFinite(seedValue)) {
        throw new Error("seed 必须是数字（或留空自动随机）");
      }

      const useIpc = isElectronEnv() && typeof window.electronAPI?.novelaiGenerateImage === "function";
      let res: { dataUrl: string; seed: number; width: number; height: number; model: string };
      if (useIpc) {
        res = await window.electronAPI.novelaiGenerateImage({
          token,
          endpoint,
          mode,
          sourceImageBase64: mode === "img2img" ? sourceImageBase64 : undefined,
          prompt,
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
        res = await generateNovelAiViaProxy({
          token,
          endpoint,
          mode,
          sourceImageBase64: mode === "img2img" ? sourceImageBase64 : undefined,
          sourceImageDataUrl,
          strength,
          noise,
          prompt,
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

      if (autoSaveHistory) {
        try {
          await addAiImageHistory({
            createdAt: Date.now(),
            mode,
            model: res.model,
            seed: res.seed,
            width: res.width,
            height: res.height,
            prompt,
            negativePrompt,
            dataUrl: res.dataUrl,
            sourceDataUrl: mode === "img2img" ? (sourceImageDataUrl || undefined) : undefined,
          });
          await refreshHistory();
        }
        catch {
          // ignore
        }
      }
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (!isElectronEnv()) {
        setEnvHint(
          [
            "当前为 Web 环境：本页会通过同源代理 `/api/novelapi/*` 请求 NovelAI（以规避 CORS/Referer 限制）。",
            "请使用 `pnpm dev` 或 `pnpm start` 启动站点；若你将前端部署为纯静态站点，需要额外部署同等代理能力。",
          ].join("\n"),
        );
      }
      setResult(null);
    }
    finally {
      setLoading(false);
    }
  }

  function setResolutionPreset(preset: "normal" | "portrait" | "landscape" | "wide") {
    if (preset === "normal") {
      setWidth(1024);
      setHeight(1024);
      return;
    }

    if (preset === "portrait") {
      setWidth(832);
      setHeight(1216);
      return;
    }

    if (preset === "landscape") {
      setWidth(1216);
      setHeight(832);
      return;
    }

    setWidth(1472);
    setHeight(704);
  }

  function onKeyDownGenerate(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void onGenerate();
    }
  }

  const isWeb = !isElectronEnv();

  const resultMetaTextShort = useMemo(() => {
    if (!result)
      return "";
    return `${result.width}×${result.height} · ${result.model}`;
  }, [result]);

  return (
    <div className="h-full w-full p-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xl font-bold leading-tight">Image Generation</div>
              <div className="text-xs opacity-70 mt-1">
                {isWeb ? "Web 环境通过同源代理 /api/novelapi/* 请求 NovelAI（不持久化 token）" : "Electron 环境通过主进程 IPC 代理请求 NovelAI（不持久化 token）"}
              </div>
            </div>
            <div className={`badge ${isWeb ? "badge-outline" : "badge-secondary"}`}>
              {isWeb ? "WEB" : "ELECTRON"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs opacity-70 hidden md:block">
              {result ? resultMetaTextShort : ""}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onGenerate()}
              disabled={loading}
            >
              {loading ? "生成中..." : "Generate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="whitespace-pre-line">{[error, envHint].filter(Boolean).join("\n")}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body gap-3">
              <div role="tablist" className="tabs tabs-bordered">
                <button
                  type="button"
                  role="tab"
                  className={`tab ${sidebarTab === "prompt" ? "tab-active" : ""}`}
                  onClick={() => setSidebarTab("prompt")}
                >
                  Prompt
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${sidebarTab === "undesired" ? "tab-active" : ""}`}
                  onClick={() => setSidebarTab("undesired")}
                >
                  Undesired
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${sidebarTab === "image" ? "tab-active" : ""}`}
                  onClick={() => setSidebarTab("image")}
                >
                  Image
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${sidebarTab === "history" ? "tab-active" : ""}`}
                  onClick={() => setSidebarTab("history")}
                >
                  History
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${sidebarTab === "connection" ? "tab-active" : ""}`}
                  onClick={() => setSidebarTab("connection")}
                >
                  Connection
                </button>
              </div>

              {sidebarTab === "connection" && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Token（Bearer）</span>
                    </label>
                    <input
                      className="input input-bordered"
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="粘贴 NovelAI token"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Endpoint</span>
                    </label>
                    <input
                      className="input input-bordered"
                      value={endpoint}
                      onChange={e => setEndpoint(e.target.value)}
                    />
                  </div>

                  <div className="text-xs opacity-70 whitespace-pre-line">
                    {isWeb
                      ? "Web：请求将通过同源代理 `/api/novelapi/*` 转发到 endpoint，并自动注入 referer/user-agent。"
                      : "Electron：请求由主进程发起（更接近真实环境），并自动注入 referer/user-agent。"}
                  </div>
                </>
              )}

              {sidebarTab === "prompt" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Prompt</div>
                    <div className="text-xs opacity-60">Ctrl/⌘ + Enter 生成</div>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-40"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={onKeyDownGenerate}
                    placeholder="best quality, ..."
                  />
                  <div className="text-xs opacity-70">or Randomize（此处仅提供随机 Seed）</div>
                </div>
              )}

              {sidebarTab === "undesired" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Undesired Content</div>
                    <div className="text-xs opacity-70">UC Preset: Enabled</div>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-40"
                    value={negativePrompt}
                    onChange={e => setNegativePrompt(e.target.value)}
                    onKeyDown={onKeyDownGenerate}
                    placeholder="nsfw, lowres, ..."
                  />
                </div>
              )}

              {sidebarTab === "image" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">模式</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={mode}
                        onChange={(e) => {
                          const next = e.target.value as AiImageHistoryMode;
                          setMode(next);
                          if (next !== "img2img") {
                            setSourceImageFile(null);
                          }
                        }}
                      >
                        <option value="txt2img">文生图（txt2img）</option>
                        <option value="img2img">图生图（img2img）</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-between">
                        <span className="label-text">自动保存历史</span>
                        <input
                          type="checkbox"
                          className="toggle"
                          checked={autoSaveHistory}
                          onChange={e => setAutoSaveHistory(e.target.checked)}
                        />
                      </label>
                    </div>
                  </div>

                  {mode === "img2img" && (
                    <div className="card bg-base-200/40 border border-base-200">
                      <div className="card-body p-3 gap-3">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">源图片</span>
                          </label>
                          <input
                            className="file-input file-input-bordered w-full"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setSourceImageFile(file);
                            }}
                          />
                        </div>

                        {sourceImageDataUrl && (
                          <div className="w-full overflow-hidden rounded-lg border border-base-200 bg-base-200">
                            <img
                              src={sourceImageDataUrl}
                              alt="source"
                              className="w-full h-auto block max-h-48 object-contain bg-base-200"
                              draggable={false}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Strength</span>
                              <span className="label-text-alt">{strength.toFixed(2)}</span>
                            </label>
                            <input
                              className="range range-sm"
                              type="range"
                              value={strength}
                              onChange={e => setStrength(Number(e.target.value))}
                              min={0}
                              max={1}
                              step={0.01}
                            />
                          </div>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Noise</span>
                              <span className="label-text-alt">{noise.toFixed(2)}</span>
                            </label>
                            <input
                              className="range range-sm"
                              type="range"
                              value={noise}
                              onChange={e => setNoise(Number(e.target.value))}
                              min={0}
                              max={1}
                              step={0.01}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Model</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={model}
                        onChange={(e) => {
                          const next = e.target.value;
                          setModel(next);
                          if (next.includes("nai-diffusion-4")) {
                            setSampler("k_euler_a");
                            setNoiseSchedule("karras");
                          }
                          else if (next === "nai-diffusion-3") {
                            setSampler("k_euler_a");
                            setNoiseSchedule("karras");
                          }
                        }}
                      >
                        {MODEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Sampler</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={sampler}
                        onChange={e => setSampler(e.target.value)}
                      >
                        {samplerOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Image Settings</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setResolutionPreset("normal")}>Normal</button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setResolutionPreset("portrait")}>Portrait</button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setResolutionPreset("landscape")}>Landscape</button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setResolutionPreset("wide")}>Wide</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Width</span>
                      </label>
                      <input
                        className="input input-bordered"
                        type="number"
                        value={width}
                        onChange={e => setWidth(Number(e.target.value))}
                        min={64}
                        step={64}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Height</span>
                      </label>
                      <input
                        className="input input-bordered"
                        type="number"
                        value={height}
                        onChange={e => setHeight(Number(e.target.value))}
                        min={64}
                        step={64}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Steps</span>
                        <span className="label-text-alt">{steps}</span>
                      </label>
                      <input
                        className="range range-sm"
                        type="range"
                        value={steps}
                        onChange={e => setSteps(Number(e.target.value))}
                        min={1}
                        max={80}
                        step={1}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Guidance</span>
                        <span className="label-text-alt">{scale.toFixed(1)}</span>
                      </label>
                      <input
                        className="range range-sm"
                        type="range"
                        value={scale}
                        onChange={e => setScale(Number(e.target.value))}
                        min={1}
                        max={20}
                        step={0.1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Noise Schedule</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={noiseSchedule}
                        onChange={e => setNoiseSchedule(e.target.value)}
                        disabled={!isNAI3 && !isNAI4}
                      >
                        {NOISE_SCHEDULES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">CFG Rescale（NAI v4）</span>
                      </label>
                      <input
                        className="input input-bordered"
                        type="number"
                        value={cfgRescale}
                        onChange={e => setCfgRescale(Number(e.target.value))}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={!isNAI4}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label cursor-pointer justify-between">
                        <span className="label-text">Quality Toggle</span>
                        <input
                          type="checkbox"
                          className="toggle"
                          checked={qualityToggle}
                          onChange={e => setQualityToggle(e.target.checked)}
                        />
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-between">
                        <span className="label-text">SMEA（NAI v3）</span>
                        <input
                          type="checkbox"
                          className="toggle"
                          checked={smea}
                          onChange={e => setSmea(e.target.checked)}
                          disabled={!isNAI3}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-between">
                      <span className="label-text">SMEA Dyn（NAI v3）</span>
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={smeaDyn}
                        onChange={e => setSmeaDyn(e.target.checked)}
                        disabled={!isNAI3}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Seed
                        {seed.trim() ? "" : "N/A"}
                      </span>
                    </label>
                    <div className="join w-full">
                      <input
                        className="input input-bordered join-item w-full"
                        value={seed}
                        onChange={e => setSeed(e.target.value)}
                        placeholder="留空自动随机"
                      />
                      <button
                        type="button"
                        className="btn btn-outline join-item"
                        onClick={() => setSeed(String(Math.floor(Math.random() * 2 ** 32)))}
                      >
                        随机
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline join-item"
                        onClick={() => setSeed("")}
                      >
                        清空
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Output</div>
                {result && (
                  <div className="text-xs opacity-70">
                    {resultMetaText}
                  </div>
                )}
              </div>

              {!result && (
                <div className="flex-1 flex items-center justify-center text-sm opacity-60 min-h-64 border border-dashed border-base-300 rounded-lg">
                  还没有生成图片
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-3">
                  <div className="w-full overflow-hidden rounded-lg border border-base-200 bg-base-200">
                    <img
                      src={result.dataUrl}
                      alt="NovelAI output"
                      className="w-full h-auto block"
                      draggable={false}
                    />
                  </div>
                  <a
                    className="btn btn-sm btn-outline"
                    href={result.dataUrl}
                    download={`nai_${mode}_${result.seed}_${result.width}x${result.height}.png`}
                  >
                    下载
                  </a>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      void (async () => {
                        await addAiImageHistory({
                          createdAt: Date.now(),
                          mode,
                          model: result.model,
                          seed: result.seed,
                          width: result.width,
                          height: result.height,
                          prompt,
                          negativePrompt,
                          dataUrl: result.dataUrl,
                          sourceDataUrl: mode === "img2img" ? (sourceImageDataUrl || undefined) : undefined,
                        });
                        await refreshHistory();
                        setSidebarTab("history");
                      })();
                    }}
                  >
                    保存到历史
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {sidebarTab === "history" && (
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">历史（本地）</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => void refreshHistory()}
                    disabled={loading}
                  >
                    刷新
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline btn-error"
                    onClick={() => {
                      void (async () => {
                        await clearAiImageHistory();
                        await refreshHistory();
                      })();
                    }}
                    disabled={loading || history.length === 0}
                  >
                    清空
                  </button>
                </div>
              </div>

              {history.length === 0 && (
                <div className="text-sm opacity-60">
                  暂无历史记录
                </div>
              )}

              {history.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {history.map((item) => {
                    const meta = `seed=${item.seed} · ${item.width}×${item.height} · ${item.model} · ${item.mode}`;
                    return (
                      <div key={item.id} className="card bg-base-200/40 border border-base-200">
                        <div className="card-body p-3 gap-2">
                          <div className="w-full overflow-hidden rounded-md border border-base-200 bg-base-200">
                            <img
                              src={item.dataUrl}
                              alt="history"
                              className="w-full h-auto block max-h-40 object-contain bg-base-200"
                              draggable={false}
                            />
                          </div>
                          <div className="text-xs opacity-70 break-all">{meta}</div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => setResult({ dataUrl: item.dataUrl, seed: item.seed, width: item.width, height: item.height, model: item.model })}
                            >
                              查看
                            </button>
                            <a
                              className="btn btn-xs btn-outline"
                              href={item.dataUrl}
                              download={`nai_${item.mode}_${item.seed}_${item.width}x${item.height}.png`}
                            >
                              下载
                            </a>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline btn-error"
                              onClick={() => {
                                void (async () => {
                                  if (typeof item.id === "number") {
                                    await deleteAiImageHistory(item.id);
                                    await refreshHistory();
                                  }
                                })();
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
