import bundledCoreJsUrl from "@ffmpeg/core?url";
import bundledCoreWasmUrl from "@ffmpeg/core/wasm?url";
import bundledWorkerUrl from "@ffmpeg/ffmpeg/worker?worker&url";

export type VideoTranscodeOptions = {
  loadTimeoutMs?: number;
  execTimeoutMs?: number;
  /**
   * 质量参数，值越小画质越高、文件越大。
   */
  crf?: number;
  /**
   * 最大高度（像素）。不传则保持原分辨率。
   */
  maxHeight?: number;
  /**
   * 最大帧率。可选，用于降低体积。
   */
  maxFps?: number;
};

const DEFAULT_LOAD_TIMEOUT_MS = 45_000;
const DEFAULT_EXEC_TIMEOUT_MS = 180_000;
const DEFAULT_CRF = 34;

let ffmpegSingletonPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

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

async function getFfmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
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
      DEFAULT_LOAD_TIMEOUT_MS,
      "FFmpeg 核心加载",
    );

    return ffmpeg;
  })().catch((error) => {
    ffmpegSingletonPromise = null;
    throw error;
  });

  return ffmpegSingletonPromise;
}

export async function transcodeVideoFileToWebmOrThrow(inputFile: File, options: VideoTranscodeOptions = {}): Promise<File> {
  if (!inputFile.type.startsWith("video/")) {
    throw new Error("只支持视频文件格式");
  }

  const outputName = ensureWebmFileName(inputFile.name);
  if (inputFile.type === "video/webm" && /\.webm$/i.test(inputFile.name)) {
    return inputFile;
  }

  const loadTimeoutMs = options.loadTimeoutMs && options.loadTimeoutMs > 0
    ? options.loadTimeoutMs
    : DEFAULT_LOAD_TIMEOUT_MS;
  const execTimeoutMs = options.execTimeoutMs && options.execTimeoutMs > 0
    ? options.execTimeoutMs
    : DEFAULT_EXEC_TIMEOUT_MS;
  const crf = Number.isFinite(options.crf) ? Math.min(51, Math.max(10, Math.round(options.crf!))) : DEFAULT_CRF;
  const maxHeight = options.maxHeight && options.maxHeight > 0 ? Math.floor(options.maxHeight) : undefined;
  const maxFps = options.maxFps && options.maxFps > 0 ? Math.floor(options.maxFps) : undefined;

  const ffmpeg = await withTimeout(getFfmpeg(), loadTimeoutMs, "FFmpeg 初始化");
  const { fetchFile } = await import("@ffmpeg/util");

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
      "-c:v",
      "libvpx-vp9",
      "-crf",
      String(crf),
      "-b:v",
      "0",
      "-row-mt",
      "1",
      "-deadline",
      "good",
      "-cpu-used",
      "2",
      "-pix_fmt",
      "yuv420p",
    ];

    if (maxHeight) {
      args.push(
        "-vf",
        `scale=-2:${maxHeight}:force_original_aspect_ratio=decrease`,
      );
    }
    if (maxFps) {
      args.push("-r", String(maxFps));
    }

    args.push(
      "-c:a",
      "libopus",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-f",
      "webm",
      outputSafeName,
    );

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
      throw new Error(`视频转码失败（ret=${ret}）`);
    }

    const outData = await ffmpeg.readFile(outputSafeName);
    if (typeof outData === "string") {
      throw new TypeError("FFmpeg 输出数据类型异常");
    }

    const outBlob = new Blob([outData], { type: "video/webm" });
    return new File([outBlob], outputName, { type: "video/webm" });
  }
  catch (error) {
    if (error instanceof Error) {
      throw new TypeError(`视频转码失败：${error.message}`);
    }
    throw new TypeError(`视频转码失败：${String(error)}`);
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
