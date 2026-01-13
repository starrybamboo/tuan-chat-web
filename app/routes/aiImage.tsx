import { unzipSync } from "fflate";
import { useMemo, useState } from "react";
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

function base64DataUrl(mime: string, bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const b64 = btoa(binary);
  return `data:${mime};base64,${b64}`;
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

async function generateNovelAiInBrowser(args: {
  token: string;
  endpoint: string;
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
  seed?: number;
}) {
  const endpointBase = args.endpoint.replace(/\/+$/, "");
  const requestUrl = `${endpointBase}/ai/generate-image`;

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
    qualityToggle: false,
  };

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

  const [prompt, setPrompt] = useState("best quality, amazing quality, very aesthetic, absurdres, 1girl");
  const [negativePrompt, setNegativePrompt] = useState("nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark");

  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [scale, setScale] = useState(5);
  const [sampler, setSampler] = useState<string>("k_euler_a");
  const [noiseSchedule, setNoiseSchedule] = useState<string>("karras");
  const [cfgRescale, setCfgRescale] = useState(0);
  const [seed, setSeed] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envHint, setEnvHint] = useState<string | null>(null);
  const [result, setResult] = useState<null | { dataUrl: string; seed: number; width: number; height: number; model: string }>(null);

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
          seed: seedValue,
        });
      }
      else {
        res = await generateNovelAiInBrowser({
          token,
          endpoint,
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
          seed: seedValue,
        });
      }

      setResult(res);
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (!isElectronEnv()) {
        setEnvHint(
          [
            "当前为 Web 环境：由于 CORS/Referer 限制，建议用 `pnpm electron:dev` 打开本页进行测试。",
            "当前为 Web 环境：NovelAI 生图需要在 Electron 环境通过 IPC 代理请求（以规避 CORS/Referer 限制）。",
          ].join("\n"),
        );
      }
      setResult(null);
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">AI生图（NovelAI）</h1>
            <div className="text-sm opacity-70 mt-1">
              说明：该页面用于本地测试 NovelAI 接口，默认通过 Electron 主进程代理请求（不会在前端持久化 token）。
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onGenerate()}
            disabled={loading}
          >
            {loading ? "生成中..." : "生成"}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="whitespace-pre-line">{[error, envHint].filter(Boolean).join("\n")}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body gap-3">
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
                  </label>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={steps}
                    onChange={e => setSteps(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Scale</span>
                  </label>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={scale}
                    onChange={e => setScale(Number(e.target.value))}
                    step={0.5}
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

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Seed（可选）</span>
                </label>
                <input
                  className="input input-bordered"
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  placeholder="留空自动随机"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Prompt</span>
                </label>
                <textarea
                  className="textarea textarea-bordered min-h-28"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Negative Prompt</span>
                </label>
                <textarea
                  className="textarea textarea-bordered min-h-20"
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">输出预览</div>
                {result && (
                  <div className="text-xs opacity-70">
                    {resultMetaText}
                  </div>
                )}
              </div>

              {!result && (
                <div className="flex-1 flex items-center justify-center text-sm opacity-60 min-h-64">
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
                    download={`nai_${result.seed}_${result.width}x${result.height}.png`}
                  >
                    下载
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
