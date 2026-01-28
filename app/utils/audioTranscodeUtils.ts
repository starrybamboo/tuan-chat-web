import bundledCoreJsUrl from "@ffmpeg/core?url";
import bundledCoreWasmUrl from "@ffmpeg/core/wasm?url";

import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";

export type AudioTranscodeOptions = {
  maxDurationSec?: number;
  bitrateKbps?: number;
  loadTimeoutMs?: number;
  execTimeoutMs?: number;
};

const DEFAULT_BITRATE_KBPS = 96;
// 对齐 @ffmpeg/ffmpeg 内置 CORE_VERSION（避免 wrapper/core 版本不一致带来兼容性风险）
const FFMPEG_CORE_VERSION = "0.12.9";
const DEFAULT_FFMPEG_CORE_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
] as const;

const DEFAULT_LOAD_TIMEOUT_MS = 45_000;
const DEFAULT_EXEC_TIMEOUT_MS = 120_000;

let ffmpegSingletonPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message;
  return String(error);
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

function getFfmpegCoreBaseUrlCandidates(): string[] {
  const env = (import.meta as any)?.env;
  const fromEnv = typeof env?.VITE_FFMPEG_CORE_BASE_URL === "string" ? env.VITE_FFMPEG_CORE_BASE_URL.trim() : "";
  if (fromEnv)
    return [fromEnv.replace(/\/+$/, "")];
  return DEFAULT_FFMPEG_CORE_BASE_URLS.map(u => u.replace(/\/+$/, ""));
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

async function fetchToBlobURL(url: string, mimeType: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const t = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok)
      throw new Error(`下载失败: ${res.status} ${res.statusText}`);
    const buf = await res.arrayBuffer();

    // 轻量校验，避免下载到 HTML / 代理错误页导致后续 importScripts 报 "failed to import"
    if (mimeType === "application/wasm") {
      const bytes = new Uint8Array(buf);
      const isWasm = bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6D;
      if (!isWasm)
        throw new Error("WASM 文件签名异常（可能下载到错误页/代理页）");
    }
    else if (mimeType === "text/javascript") {
      const head = new TextDecoder("utf-8").decode(buf.slice(0, 256)).trimStart().toLowerCase();
      if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<script") || head.startsWith("<!—") || head.startsWith("<!--"))
        throw new Error("JS 文件内容异常（可能下载到 HTML/代理页）");
    }

    return URL.createObjectURL(new Blob([buf], { type: mimeType }));
  }
  finally {
    globalThis.clearTimeout(t);
  }
}

async function getFfmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegSingletonPromise)
    return ffmpegSingletonPromise;

  ffmpegSingletonPromise = (async () => {
    try {
      if (typeof window === "undefined") {
        throw new TypeError("当前环境不支持音频转码（需要浏览器环境）");
      }

      const debugEnabled = isAudioUploadDebugEnabled();
      const debugPrefix = "[tc-audio-upload]";

      const [{ FFmpeg }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
      ]);

      const candidates = getFfmpegCoreBaseUrlCandidates();
      const bundledCandidates = [
        {
          label: "bundled",
          coreJs: bundledCoreJsUrl,
          wasm: bundledCoreWasmUrl,
        },
      ];

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

          // 同源静态资源：直接使用 URL（避免 blob URL 在某些环境下无法 dynamic import）
          const coreURL = c.coreJs;
          const wasmURL = c.wasm;

          await withTimeout(ffmpeg.load({ coreURL, wasmURL }), DEFAULT_LOAD_TIMEOUT_MS, "FFmpeg 核心加载");

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

          const coreURL = await fetchToBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript", DEFAULT_LOAD_TIMEOUT_MS);
          const wasmURL = await fetchToBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm", DEFAULT_LOAD_TIMEOUT_MS);

          await withTimeout(ffmpeg.load({ coreURL, wasmURL }), DEFAULT_LOAD_TIMEOUT_MS, "FFmpeg 核心加载");

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

function ensureOpusFileName(originalName: string): string {
  const base = (originalName || "audio").replace(/[/\\?%*:|"<>]/g, "_");
  const dot = base.lastIndexOf(".");
  if (dot > 0)
    return `${base.slice(0, dot)}.ogg`;
  return `${base}.ogg`;
}

export async function transcodeAudioFileToOpusOrThrow(inputFile: File, options: AudioTranscodeOptions = {}): Promise<File> {
  const bitrateKbps = options.bitrateKbps && options.bitrateKbps > 0 ? options.bitrateKbps : DEFAULT_BITRATE_KBPS;
  const maxDurationSec = options.maxDurationSec && options.maxDurationSec > 0 ? options.maxDurationSec : undefined;
  const loadTimeoutMs = options.loadTimeoutMs && options.loadTimeoutMs > 0 ? options.loadTimeoutMs : DEFAULT_LOAD_TIMEOUT_MS;
  const execTimeoutMs = options.execTimeoutMs && options.execTimeoutMs > 0 ? options.execTimeoutMs : DEFAULT_EXEC_TIMEOUT_MS;
  const debugEnabled = isAudioUploadDebugEnabled();
  const debugPrefix = "[tc-audio-upload]";

  const ffmpeg = await withTimeout(getFfmpeg(), loadTimeoutMs, "FFmpeg 初始化");
  const { fetchFile } = await import("@ffmpeg/util");

  const runOnce = async (params: { bitrateKbps: number; downmixToMono: boolean; sampleRateHz?: number; compressionLevel: number; tag: string }) => {
    const inputSafeName = `input-${Date.now()}-${Math.random().toString(16).slice(2)}${(() => {
      const ext = inputFile.name.includes(".") ? `.${inputFile.name.split(".").pop()}` : "";
      return ext || ".bin";
    })()}`;
    const outputSafeName = `output-${Date.now()}-${Math.random().toString(16).slice(2)}.ogg`;

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
        "audio",
        "-f",
        "ogg",
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
      const outBlob = new Blob([outBytes], { type: "audio/ogg" });
      const outName = ensureOpusFileName(inputFile.name);
      const outFile = new File([outBlob], outName, { type: "audio/ogg" });
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

  try {
    return await runOnce({
      tag: "primary",
      bitrateKbps,
      downmixToMono: false,
      compressionLevel: 10,
    });
  }
  catch (error) {
    if (debugEnabled)
      console.error(`${debugPrefix} ffmpeg transcode failed`, error);

    // 常见：WASM 内存越界（某些输入/环境下会发生），尝试重置 worker 并用更保守参数重试一次
    if (isWasmMemoryOutOfBounds(error)) {
      if (debugEnabled)
        console.warn(`${debugPrefix} retry after wasm memory OOB`);

      await terminateFfmpegAndResetSingleton(ffmpeg);

      try {
        const ffmpeg2 = await withTimeout(getFfmpeg(), loadTimeoutMs, "FFmpeg 初始化（重试）");
        const { fetchFile: fetchFile2 } = await import("@ffmpeg/util");
        // reuse closures by shadowing
        const _ffmpeg = ffmpeg2;
        const _fetchFile = fetchFile2;

        const runOnceRetry = async () => {
          const inputSafeName = `input-${Date.now()}-${Math.random().toString(16).slice(2)}${(() => {
            const ext = inputFile.name.includes(".") ? `.${inputFile.name.split(".").pop()}` : "";
            return ext || ".bin";
          })()}`;
          const outputSafeName = `output-${Date.now()}-${Math.random().toString(16).slice(2)}.ogg`;

          try {
            await _ffmpeg.writeFile(inputSafeName, await _fetchFile(inputFile));
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
              // 更保守：单声道 + 24kHz + 更低复杂度
              "-ac",
              "1",
              "-ar",
              "24000",
              "-c:a",
              "libopus",
              "-b:a",
              `${Math.min(64, bitrateKbps)}k`,
              "-vbr",
              "on",
              "-compression_level",
              "8",
              "-application",
              "audio",
              "-f",
              "ogg",
              outputSafeName,
            );

            if (debugEnabled)
              console.warn(`${debugPrefix} ffmpeg args`, { tag: "retry", args });

            const controller = new AbortController();
            const t = globalThis.setTimeout(() => controller.abort(), execTimeoutMs);
            let ret: number;
            try {
              ret = await _ffmpeg.exec(args, execTimeoutMs, { signal: controller.signal });
            }
            finally {
              globalThis.clearTimeout(t);
            }

            if (ret !== 0)
              throw new Error(`FFmpeg 转码失败（ret=${ret}）`);

            const outData = await _ffmpeg.readFile(outputSafeName);
            if (typeof outData === "string")
              throw new TypeError("FFmpeg 输出数据类型异常");

            const outBytes: Uint8Array = outData;
            const outBlob = new Blob([outBytes], { type: "audio/ogg" });
            return new File([outBlob], ensureOpusFileName(inputFile.name), { type: "audio/ogg" });
          }
          finally {
            try {
              await _ffmpeg.deleteFile(inputSafeName);
            }
            catch {}

            try {
              await _ffmpeg.deleteFile(outputSafeName);
            }
            catch {}
          }
        };

        return await runOnceRetry();
      }
      catch (retryError) {
        if (debugEnabled)
          console.error(`${debugPrefix} ffmpeg retry failed`, retryError);
        const msg = normalizeErrorMessage(retryError);
        throw new Error(`音频转码失败，已阻止上传: ${msg}`);
      }
    }

    const msg = normalizeErrorMessage(error);
    throw new Error(`音频转码失败，已阻止上传: ${msg}`);
  }
}

export async function transcodeAudioBlobToOpusOrThrow(inputBlob: Blob, fileName: string, options: AudioTranscodeOptions = {}): Promise<File> {
  const inputFile = new File([inputBlob], fileName || "audio", { type: inputBlob.type || "application/octet-stream" });
  return await transcodeAudioFileToOpusOrThrow(inputFile, options);
}
