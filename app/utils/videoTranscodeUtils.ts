import bundledCoreJsUrl from "@ffmpeg/core?url";
import bundledCoreWasmUrl from "@ffmpeg/core/wasm?url";
import bundledWorkerUrl from "@ffmpeg/ffmpeg/worker?worker&url";

import { resolveFfmpegLoadTimeoutMs } from "@/utils/ffmpegLoadTimeoutConfig";

export type VideoTranscodeOptions = {
  loadTimeoutMs?: number;
  execTimeoutMs?: number;
  /**
   * 质量参数，值越小画质越高、文件越大。
   */
  crf?: number;
  /**
   * 最大高度（像素）。不传则首轮保持原分辨率。
   */
  maxHeight?: number;
  /**
   * 最大帧率。可选，用于降低体积。
   */
  maxFps?: number;
};

type VideoTranscodePreset = {
  tag: string;
  videoCodec: "libvpx-vp9" | "libvpx";
  maxHeight?: number;
  maxFps?: number;
  crf: number;
  audioBitrateKbps: number;
  dropAudio: boolean;
  cpuUsed: number;
  deadline: "good" | "realtime";
};

const DEFAULT_EXEC_TIMEOUT_MS = 180_000;
const DEFAULT_CRF = 34;
const MIN_CRF = 10;
const MAX_CRF = 51;

let ffmpegSingletonPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isWasmMemoryOutOfBounds(error: unknown): boolean {
  return normalizeErrorMessage(error).toLowerCase().includes("memory access out of bounds");
}

async function terminateFfmpegAndResetSingleton(ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null | undefined): Promise<void> {
  ffmpegSingletonPromise = null;
  if (!ffmpeg)
    return;
  try {
    ffmpeg.terminate();
  }
  catch {
    // ignore
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} 超时（${timeoutMs}ms）`));
    }, timeoutMs);

    promise.then((value) => {
      globalThis.clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      globalThis.clearTimeout(timer);
      reject(error);
    });
  });
}

function toAbsoluteUrl(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }
  try {
    return new URL(url, window.location.href).toString();
  }
  catch {
    return url;
  }
}

function ensureWebmFileName(originalName: string): string {
  const safe = (originalName || "video").replace(/[/\\?%*:|"<>]/g, "_");
  const dot = safe.lastIndexOf(".");
  if (dot > 0) {
    return `${safe.slice(0, dot)}.webm`;
  }
  return `${safe}.webm`;
}

function toPositiveInt(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildFilterChain(maxHeight?: number, maxFps?: number): string | undefined {
  const filters: string[] = [];
  if (maxHeight && maxHeight > 0) {
    filters.push(`scale=-2:${maxHeight}:force_original_aspect_ratio=decrease`);
  }
  if (maxFps && maxFps > 0) {
    filters.push(`fps=${maxFps}`);
  }
  return filters.length > 0 ? filters.join(",") : undefined;
}

function buildPresetKey(preset: VideoTranscodePreset): string {
  return [
    preset.videoCodec,
    preset.maxHeight ?? 0,
    preset.maxFps ?? 0,
    preset.crf,
    preset.audioBitrateKbps,
    preset.dropAudio ? 1 : 0,
    preset.cpuUsed,
    preset.deadline,
  ].join("|");
}

function buildVideoTranscodePresets(base: { maxHeight?: number; maxFps?: number; crf: number }): VideoTranscodePreset[] {
  const baseHeight = toPositiveInt(base.maxHeight);
  const baseFps = toPositiveInt(base.maxFps);
  const baseCrf = clamp(Math.round(base.crf), MIN_CRF, MAX_CRF);

  const aggressiveHeightFromBase = baseHeight ? Math.min(baseHeight, 720) : 720;
  const mediumHeightFromBase = baseHeight ? Math.min(baseHeight, 540) : 540;
  const lowHeightFromBase = baseHeight ? Math.min(baseHeight, 480) : 480;

  const aggressiveFpsFromBase = baseFps ? Math.min(baseFps, 24) : 24;
  const mediumFpsFromBase = baseFps ? Math.min(baseFps, 20) : 20;
  const lowFpsFromBase = baseFps ? Math.min(baseFps, 15) : 15;

  const rawPresets: VideoTranscodePreset[] = [
    {
      tag: "base-vp9",
      videoCodec: "libvpx-vp9",
      maxHeight: baseHeight,
      maxFps: baseFps,
      crf: baseCrf,
      audioBitrateKbps: 96,
      dropAudio: false,
      cpuUsed: 2,
      deadline: "good",
    },
    {
      tag: "fallback-vp8-1",
      videoCodec: "libvpx",
      maxHeight: aggressiveHeightFromBase,
      maxFps: aggressiveFpsFromBase,
      crf: clamp(Math.max(baseCrf, 36), MIN_CRF, MAX_CRF),
      audioBitrateKbps: 80,
      dropAudio: false,
      cpuUsed: 6,
      deadline: "realtime",
    },
    {
      tag: "fallback-vp8-2",
      videoCodec: "libvpx",
      maxHeight: mediumHeightFromBase,
      maxFps: mediumFpsFromBase,
      crf: clamp(Math.max(baseCrf, 38), MIN_CRF, MAX_CRF),
      audioBitrateKbps: 64,
      dropAudio: false,
      cpuUsed: 8,
      deadline: "realtime",
    },
    {
      tag: "fallback-vp8-noaudio",
      videoCodec: "libvpx",
      maxHeight: lowHeightFromBase,
      maxFps: lowFpsFromBase,
      crf: clamp(Math.max(baseCrf, 40), MIN_CRF, MAX_CRF),
      audioBitrateKbps: 48,
      dropAudio: true,
      cpuUsed: 8,
      deadline: "realtime",
    },
  ];

  const deduped: VideoTranscodePreset[] = [];
  const seen = new Set<string>();
  for (const preset of rawPresets) {
    const key = buildPresetKey(preset);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(preset);
  }
  return deduped;
}

async function getFfmpeg(loadTimeoutMs: number): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegSingletonPromise) {
    return ffmpegSingletonPromise;
  }

  ffmpegSingletonPromise = (async () => {
    if (typeof window === "undefined") {
      throw new TypeError("当前环境不支持视频转码（需要浏览器环境）");
    }

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg = new FFmpeg();
    const classWorkerURL = toAbsoluteUrl(bundledWorkerUrl);

    await withTimeout(
      ffmpeg.load({
        coreURL: bundledCoreJsUrl,
        wasmURL: bundledCoreWasmUrl,
        classWorkerURL,
      }),
      loadTimeoutMs,
      "FFmpeg 核心加载",
    );

    return ffmpeg;
  })().catch((error) => {
    ffmpegSingletonPromise = null;
    throw error;
  });

  return ffmpegSingletonPromise;
}

async function runVideoTranscodeOnce(params: {
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg;
  inputFile: File;
  outputName: string;
  execTimeoutMs: number;
  preset: VideoTranscodePreset;
  fetchFile: (file: File) => Promise<Uint8Array>;
}): Promise<File> {
  const {
    ffmpeg,
    inputFile,
    outputName,
    execTimeoutMs,
    preset,
    fetchFile,
  } = params;

  const inputSafeName = `input-${Date.now()}-${Math.random().toString(16).slice(2)}${(() => {
    const ext = inputFile.name.includes(".") ? `.${inputFile.name.split(".").pop()}` : "";
    return ext || ".bin";
  })()}`;
  const outputSafeName = `output-${Date.now()}-${Math.random().toString(16).slice(2)}.webm`;

  try {
    await ffmpeg.writeFile(inputSafeName, await fetchFile(inputFile));

    const args: string[] = [
      "-hide_banner",
      "-nostdin",
      "-y",
      "-i",
      inputSafeName,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-map_metadata",
      "-1",
    ];

    const filterChain = buildFilterChain(preset.maxHeight, preset.maxFps);
    if (filterChain) {
      args.push("-vf", filterChain);
    }

    args.push(
      "-c:v",
      preset.videoCodec,
      "-crf",
      String(preset.crf),
      "-b:v",
      "0",
      "-deadline",
      preset.deadline,
      "-cpu-used",
      String(preset.cpuUsed),
      "-pix_fmt",
      "yuv420p",
    );

    if (preset.videoCodec === "libvpx-vp9") {
      args.push("-row-mt", "1", "-threads", "1");
    }

    if (preset.dropAudio) {
      args.push("-an");
    }
    else {
      args.push(
        "-c:a",
        "libopus",
        "-b:a",
        `${preset.audioBitrateKbps}k`,
        "-ac",
        "2",
      );
    }

    args.push("-f", "webm", outputSafeName);

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), execTimeoutMs);
    let ret: number;
    try {
      ret = await ffmpeg.exec(args, execTimeoutMs, { signal: controller.signal });
    }
    finally {
      globalThis.clearTimeout(timer);
    }

    if (ret !== 0) {
      throw new Error(`视频转码失败（${preset.tag}, ret=${ret}）`);
    }

    const outData = await ffmpeg.readFile(outputSafeName);
    if (typeof outData === "string") {
      throw new TypeError("FFmpeg 输出数据类型异常");
    }

    const outBlob = new Blob([outData], { type: "video/webm" });
    return new File([outBlob], outputName, { type: "video/webm" });
  }
  finally {
    try {
      await ffmpeg.deleteFile(inputSafeName);
    }
    catch {}
    try {
      await ffmpeg.deleteFile(outputSafeName);
    }
    catch {}
  }
}

export async function transcodeVideoFileToWebmOrThrow(inputFile: File, options: VideoTranscodeOptions = {}): Promise<File> {
  if (!inputFile.type.startsWith("video/")) {
    throw new Error("只支持视频文件格式");
  }

  const outputName = ensureWebmFileName(inputFile.name);
  if (inputFile.type === "video/webm" && /\.webm$/i.test(inputFile.name)) {
    return inputFile;
  }

  const loadTimeoutMs = resolveFfmpegLoadTimeoutMs(options.loadTimeoutMs);
  const execTimeoutMs = options.execTimeoutMs && options.execTimeoutMs > 0
    ? options.execTimeoutMs
    : DEFAULT_EXEC_TIMEOUT_MS;
  const maxHeight = toPositiveInt(options.maxHeight);
  const maxFps = toPositiveInt(options.maxFps);
  const crf = Number.isFinite(options.crf) ? clamp(Math.round(options.crf!), MIN_CRF, MAX_CRF) : DEFAULT_CRF;

  let ffmpeg = await withTimeout(getFfmpeg(loadTimeoutMs), loadTimeoutMs, "FFmpeg 初始化");
  const { fetchFile } = await import("@ffmpeg/util");
  const presets = buildVideoTranscodePresets({ maxHeight, maxFps, crf });

  let lastError: unknown = null;

  for (const preset of presets) {
    try {
      return await runVideoTranscodeOnce({
        ffmpeg,
        inputFile,
        outputName,
        execTimeoutMs,
        preset,
        fetchFile,
      });
    }
    catch (error) {
      lastError = error;

      // 常见：WASM 内存越界。重建 worker 后对同一档参数重试一次，再继续降档。
      if (isWasmMemoryOutOfBounds(error)) {
        await terminateFfmpegAndResetSingleton(ffmpeg);
        try {
          ffmpeg = await withTimeout(getFfmpeg(loadTimeoutMs), loadTimeoutMs, "FFmpeg 初始化（重试）");
          return await runVideoTranscodeOnce({
            ffmpeg,
            inputFile,
            outputName,
            execTimeoutMs,
            preset: { ...preset, tag: `${preset.tag}-retry` },
            fetchFile,
          });
        }
        catch (retryError) {
          lastError = retryError;
          continue;
        }
      }
    }
  }

  throw new TypeError(`视频转码失败，已尝试 ${presets.length} 组参数：${normalizeErrorMessage(lastError)}`);
}
