import bundledCoreJsUrl from "@ffmpeg/core?url";
import bundledCoreWasmUrl from "@ffmpeg/core/wasm?url";
import bundledWorkerUrl from "@ffmpeg/ffmpeg/worker?worker&url";

import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { resolvePersistentFfmpegAssetBlobUrl } from "@/utils/ffmpegAssetCache";
import {
  getFfmpegCoreBaseUrlCandidates,
  getFfmpegWrapperUrlCandidates,
  shouldUseBundledFfmpegCore,
} from "@/utils/ffmpegCoreSourceConfig";
import { resolveFfmpegLoadTimeoutMs } from "@/utils/ffmpegLoadTimeoutConfig";

export type AudioTranscodeOptions = {
  maxDurationSec?: number;
  bitrateKbps?: number;
  loadTimeoutMs?: number;
  execTimeoutMs?: number;
  downmixToMono?: boolean;
  sampleRateHz?: number;
  compressionLevel?: number;
  /**
   * 期望转码后文件严格小于该字节数；若无法做到将抛错并阻止上传。
   * 用于“比输入更小”的强约束策略。
   */
  preferSmallerThanBytes?: number;
};

const DEFAULT_BITRATE_KBPS = 64;
const DEFAULT_EXEC_TIMEOUT_MS = 120_000;

let ffmpegSingletonPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;
let ffmpegDebugConfigLogged = false;

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message;
  return String(error);
}

function toAbsoluteUrl(url: string): string {
  if (typeof window === "undefined")
    return url;
  try {
    return new URL(url, window.location.href).toString();
  }
  catch {
    return url;
  }
}

function isWasmMemoryOutOfBounds(error: unknown): boolean {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return msg.includes("memory access out of bounds");
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

function isFfmpegWrapperStrict(): boolean {
  const env = import.meta.env as any;
  if (typeof env?.VITE_FFMPEG_WRAPPER_STRICT === "string")
    return env.VITE_FFMPEG_WRAPPER_STRICT.toLowerCase() === "true";
  return env?.VITE_FFMPEG_WRAPPER_STRICT === true;
}

function shouldPreferRemoteFfmpegWrapper(): boolean {
  const env = import.meta.env as any;
  if (typeof env?.VITE_FFMPEG_WRAPPER_PREFER_REMOTE === "string")
    return env.VITE_FFMPEG_WRAPPER_PREFER_REMOTE.toLowerCase() === "true";
  return env?.VITE_FFMPEG_WRAPPER_PREFER_REMOTE === true;
}

async function loadFfmpegModule(debugEnabled: boolean, debugPrefix: string): Promise<typeof import("@ffmpeg/ffmpeg")> {
  const wrapperUrls = getFfmpegWrapperUrlCandidates();
  const strict = isFfmpegWrapperStrict();
  const preferRemote = shouldPreferRemoteFfmpegWrapper();
  const errors: string[] = [];

  const tryBundled = async () => {
    try {
      if (debugEnabled)
        console.warn(`${debugPrefix} ffmpeg wrapper bundled`);
      return await import("@ffmpeg/ffmpeg");
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`bundled: ${msg}`);
      if (debugEnabled)
        console.warn(`${debugPrefix} ffmpeg wrapper bundled failed`, { msg });
      return null;
    }
  };

  if (!preferRemote) {
    const bundled = await tryBundled();
    if (bundled)
      return bundled;
  }

  if (wrapperUrls.length > 0) {
    for (const wrapperUrl of wrapperUrls) {
      try {
        if (debugEnabled)
          console.warn(`${debugPrefix} ffmpeg wrapper url`, wrapperUrl);
        return await import(/* @vite-ignore */ wrapperUrl);
      }
      catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${wrapperUrl}: ${msg}`);
        if (debugEnabled)
          console.warn(`${debugPrefix} ffmpeg wrapper url failed`, { wrapperUrl, msg });
      }
    }
  }

  if (strict && wrapperUrls.length > 0) {
    const detail = errors.length > 0 ? `\n${errors.join("\n")}` : "";
    throw new Error(`FFmpeg wrapper 加载失败（严格模式，不回退）：${detail || "未知错误"}`);
  }

  if (preferRemote) {
    const bundled = await tryBundled();
    if (bundled)
      return bundled;
  }

  const detail = errors.length > 0 ? `\n${errors.join("\n")}` : "";
  throw new Error(`FFmpeg wrapper 加载失败：${detail || "未知错误"}`);
}

function logFfmpegDebugConfig(debugEnabled: boolean, debugPrefix: string, loadTimeoutMs: number): void {
  if (!debugEnabled || ffmpegDebugConfigLogged)
    return;
  ffmpegDebugConfigLogged = true;
  const env = import.meta.env as any;
  const mode = typeof env?.MODE === "string" ? env.MODE : "unknown";
  const wrapperUrls = getFfmpegWrapperUrlCandidates();
  const strict = isFfmpegWrapperStrict();
  const preferRemote = shouldPreferRemoteFfmpegWrapper();
  const coreBase = typeof env?.VITE_FFMPEG_CORE_BASE_URL === "string" ? env.VITE_FFMPEG_CORE_BASE_URL.trim() : "";
  const useDefaultCoreCdnFallback = typeof env?.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === "string"
    ? env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK.toLowerCase() === "true"
    : env?.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === true;
  const skipBundled = typeof env?.VITE_FFMPEG_CORE_SKIP_BUNDLED === "string"
    ? env.VITE_FFMPEG_CORE_SKIP_BUNDLED.toLowerCase() === "true"
    : env?.VITE_FFMPEG_CORE_SKIP_BUNDLED === true;
  console.warn(`${debugPrefix} ffmpeg config`, {
    mode,
    wrapperUrl: wrapperUrls.length > 0 ? wrapperUrls : "(empty)",
    wrapperStrict: strict,
    wrapperPreferRemote: preferRemote,
    loadTimeoutMs,
    coreBaseUrl: coreBase || "(empty)",
    coreUseDefaultCdnFallback: useDefaultCoreCdnFallback,
    coreSkipBundled: skipBundled,
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0)
    return promise;

  return new Promise<T>((resolve, reject) => {
    const t = globalThis.setTimeout(() => {
      reject(new Error(`${label} 超时（${timeoutMs}ms）`));
    }, timeoutMs);

    promise.then(
      (v) => {
        globalThis.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        globalThis.clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function getFfmpeg(loadTimeoutMs: number): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegSingletonPromise)
    return ffmpegSingletonPromise;

  ffmpegSingletonPromise = (async () => {
    try {
      if (typeof window === "undefined") {
        throw new TypeError("当前环境不支持音频转码（需要浏览器环境）");
      }

      const debugEnabled = isAudioUploadDebugEnabled();
      const debugPrefix = "[tc-audio-upload]";
      logFfmpegDebugConfig(debugEnabled, debugPrefix, loadTimeoutMs);

      const { FFmpeg } = await loadFfmpegModule(debugEnabled, debugPrefix);

      const candidates = getFfmpegCoreBaseUrlCandidates();
      const bundledCandidates = shouldUseBundledFfmpegCore()
        ? [
            {
              label: "bundled",
              coreJs: bundledCoreJsUrl,
              wasm: bundledCoreWasmUrl,
            },
          ]
        : [];
      const classWorkerURL = toAbsoluteUrl(bundledWorkerUrl);

      const ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg = new FFmpeg();

      if (debugEnabled) {
        try {
          ffmpeg.on("progress", ({ progress, time }: any) => {
            const p = typeof progress === "number" && Number.isFinite(progress) ? progress : undefined;
            const t = typeof time === "number" && Number.isFinite(time) ? time : undefined;
            console.warn(`${debugPrefix} ffmpeg progress`, { progress: p, time: t });
          });
          ffmpeg.on("log", ({ type, message }: any) => {
            console.warn(`${debugPrefix} ffmpeg log`, { type, message });
          });
        }
        catch {
          // ignore
        }
      }

      const errors: string[] = [];
      for (const c of bundledCandidates) {
        try {
          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg core candidate`, c.label);

          // core.js 保持同源直链，wasm 走持久缓存后的 blob URL，避免每次重新回源下载大文件。
          const coreURL = c.coreJs;
          const wasmURL = await resolvePersistentFfmpegAssetBlobUrl(c.wasm, "application/wasm", loadTimeoutMs);

          await withTimeout(ffmpeg.load({ coreURL, wasmURL, classWorkerURL }), loadTimeoutMs, "FFmpeg 核心加载");

          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg loaded`, { label: c.label });

          return ffmpeg;
        }
        catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${c.label}: ${msg}`);
          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg core candidate failed`, { label: c.label, msg });
        }
      }

      for (const baseUrl of candidates) {
        try {
          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg core candidate`, baseUrl);

          const coreURL = await resolvePersistentFfmpegAssetBlobUrl(`${baseUrl}/ffmpeg-core.js`, "text/javascript", loadTimeoutMs);
          const wasmURL = await resolvePersistentFfmpegAssetBlobUrl(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm", loadTimeoutMs);

          await withTimeout(ffmpeg.load({ coreURL, wasmURL, classWorkerURL }), loadTimeoutMs, "FFmpeg 核心加载");

          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg loaded`, { baseUrl });

          return ffmpeg;
        }
        catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${baseUrl}: ${msg}`);
          if (debugEnabled)
            console.warn(`${debugPrefix} ffmpeg core candidate failed`, { baseUrl, msg });
        }
      }

      throw new Error(`FFmpeg 核心加载失败（已尝试 ${bundledCandidates.length + candidates.length} 个源）：\n${errors.join("\n")}`);
    }
    catch (e) {
      ffmpegSingletonPromise = null;
      throw e;
    }
  })();

  return ffmpegSingletonPromise;
}

function ensureOpusWebmFileName(originalName: string): string {
  const base = (originalName || "audio").replace(/[/\\?%*:|"<>]/g, "_");
  const dot = base.lastIndexOf(".");
  if (dot > 0)
    return `${base.slice(0, dot)}.webm`;
  return `${base}.webm`;
}

type TranscodePreset = {
  tag: string;
  bitrateKbps: number;
  downmixToMono: boolean;
  sampleRateHz?: number;
  compressionLevel: number;
  application?: "audio" | "voip";
};

export async function transcodeAudioFileToOpusOrThrow(inputFile: File, options: AudioTranscodeOptions = {}): Promise<File> {
  const inputTargetBytes = typeof options.preferSmallerThanBytes === "number" && Number.isFinite(options.preferSmallerThanBytes) && options.preferSmallerThanBytes > 0
    ? Math.floor(options.preferSmallerThanBytes)
    : undefined;

  const baseBitrateKbps = options.bitrateKbps && options.bitrateKbps > 0 ? options.bitrateKbps : DEFAULT_BITRATE_KBPS;
  const downmixToMono = options.downmixToMono === true;
  const sampleRateHz = options.sampleRateHz && options.sampleRateHz > 0 ? Math.floor(options.sampleRateHz) : undefined;
  const compressionLevel = options.compressionLevel && options.compressionLevel > 0 ? Math.min(10, Math.max(0, Math.floor(options.compressionLevel))) : 10;

  const maxDurationSec = options.maxDurationSec && options.maxDurationSec > 0 ? options.maxDurationSec : undefined;
  const loadTimeoutMs = resolveFfmpegLoadTimeoutMs(options.loadTimeoutMs);
  const execTimeoutMs = options.execTimeoutMs && options.execTimeoutMs > 0 ? options.execTimeoutMs : DEFAULT_EXEC_TIMEOUT_MS;
  const debugEnabled = isAudioUploadDebugEnabled();
  const debugPrefix = "[tc-audio-upload]";

  let ffmpeg = await withTimeout(getFfmpeg(loadTimeoutMs), loadTimeoutMs, "FFmpeg 初始化");
  const { fetchFile } = await import("@ffmpeg/util");

  const runOnce = async (params: TranscodePreset) => {
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
      ];
      if (maxDurationSec)
        args.push("-t", String(maxDurationSec));

      args.push(
        "-vn",
        "-map_metadata",
        "-1",
      );

      if (params.downmixToMono)
        args.push("-ac", "1");

      if (params.sampleRateHz && params.sampleRateHz > 0)
        args.push("-ar", String(params.sampleRateHz));

      args.push(
        "-c:a",
        "libopus",
        "-b:a",
        `${params.bitrateKbps}k`,
        "-vbr",
        "on",
        "-compression_level",
        String(params.compressionLevel),
        "-application",
        params.application || "audio",
        "-f",
        "webm",
        outputSafeName,
      );

      if (debugEnabled) {
        console.warn(`${debugPrefix} ffmpeg input`, { name: inputFile.name, type: inputFile.type, size: inputFile.size });
        console.warn(`${debugPrefix} ffmpeg args`, {
          tag: params.tag,
          bitrateKbps: params.bitrateKbps,
          maxDurationSec,
          downmixToMono: params.downmixToMono,
          sampleRateHz: params.sampleRateHz,
          execTimeoutMs,
          args,
          baseUrlCandidates: getFfmpegCoreBaseUrlCandidates(),
        });
      }

      const controller = new AbortController();
      const t = globalThis.setTimeout(() => controller.abort(), execTimeoutMs);
      let ret: number;
      try {
        // 同时设置 core 内部 timeout + 外部 abort（避免 worker 卡死）
        ret = await ffmpeg.exec(args, execTimeoutMs, { signal: controller.signal });
      }
      finally {
        globalThis.clearTimeout(t);
      }

      if (ret !== 0)
        throw new Error(`FFmpeg 转码失败（ret=${ret}）`);

      const outData = await ffmpeg.readFile(outputSafeName);
      if (typeof outData === "string")
        throw new TypeError("FFmpeg 输出数据类型异常");

      const outBytes: Uint8Array = outData;
      const outBlob = new Blob([outBytes], { type: "audio/webm" });
      const outName = ensureOpusWebmFileName(inputFile.name);
      const outFile = new File([outBlob], outName, { type: "audio/webm" });
      if (debugEnabled)
        console.warn(`${debugPrefix} ffmpeg output`, { tag: params.tag, name: outFile.name, type: outFile.type, size: outFile.size });
      return outFile;
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
  };

  const presets: TranscodePreset[] = inputTargetBytes
    ? [
        { tag: "size-primary", bitrateKbps: Math.min(64, Math.max(24, baseBitrateKbps)), downmixToMono, sampleRateHz, compressionLevel },
        { tag: "size-48-mono-24k", bitrateKbps: 48, downmixToMono: true, sampleRateHz: 24000, compressionLevel: 8, application: "voip" },
        { tag: "size-32-mono-16k", bitrateKbps: 32, downmixToMono: true, sampleRateHz: 16000, compressionLevel: 8, application: "voip" },
        { tag: "size-24-mono-16k", bitrateKbps: 24, downmixToMono: true, sampleRateHz: 16000, compressionLevel: 8, application: "voip" },
        { tag: "size-20-mono-12k", bitrateKbps: 20, downmixToMono: true, sampleRateHz: 12000, compressionLevel: 8, application: "voip" },
        { tag: "size-16-mono-12k", bitrateKbps: 16, downmixToMono: true, sampleRateHz: 12000, compressionLevel: 8, application: "voip" },
      ]
    : [
        { tag: "primary", bitrateKbps: baseBitrateKbps, downmixToMono, sampleRateHz, compressionLevel },
      ];

  let smallestBytes: number | null = null;
  let lastError: unknown = null;

  const attemptOnce = async (preset: TranscodePreset): Promise<File> => {
    try {
      const out = await runOnce(preset);
      if (smallestBytes == null || out.size < smallestBytes)
        smallestBytes = out.size;
      return out;
    }
    catch (error) {
      lastError = error;
      if (debugEnabled)
        console.error(`${debugPrefix} ffmpeg transcode failed`, { tag: preset.tag, error });

      // 常见：WASM 内存越界（某些输入/环境下会发生），尝试重置 worker，并用同一 preset 重跑一次
      if (isWasmMemoryOutOfBounds(error)) {
        if (debugEnabled)
          console.warn(`${debugPrefix} retry after wasm memory OOB`, { tag: preset.tag });
        await terminateFfmpegAndResetSingleton(ffmpeg);
        ffmpeg = await withTimeout(getFfmpeg(loadTimeoutMs), loadTimeoutMs, "FFmpeg 初始化（重试）");
        try {
          const out = await runOnce({ ...preset, tag: `${preset.tag}-retry` });
          if (smallestBytes == null || out.size < smallestBytes)
            smallestBytes = out.size;
          return out;
        }
        catch (retryError) {
          lastError = retryError;
          if (debugEnabled)
            console.error(`${debugPrefix} ffmpeg retry failed`, { tag: preset.tag, retryError });
          throw retryError;
        }
      }
      throw error;
    }
  };

  for (const preset of presets) {
    try {
      const out = await attemptOnce(preset);
      if (!inputTargetBytes || out.size < inputTargetBytes)
        return out;
      if (debugEnabled)
        console.warn(`${debugPrefix} output not smaller than input`, { tag: preset.tag, outBytes: out.size, inputBytes: inputTargetBytes });
    }
    catch {
      // ignore and try next preset
    }
  }

  if (inputTargetBytes && smallestBytes != null) {
    const inputKb = (inputTargetBytes / 1024).toFixed(1);
    const outKb = (smallestBytes / 1024).toFixed(1);
    throw new Error(`音频转码后未变小（原始 ${inputKb}KB，最小 ${outKb}KB），已阻止上传`);
  }

  throw new Error(`音频转码失败，已阻止上传: ${normalizeErrorMessage(lastError)}`);
}

export async function transcodeAudioBlobToOpusOrThrow(inputBlob: Blob, fileName: string, options: AudioTranscodeOptions = {}): Promise<File> {
  const inputFile = new File([inputBlob], fileName || "audio", { type: inputBlob.type || "application/octet-stream" });
  return await transcodeAudioFileToOpusOrThrow(inputFile, options);
}
