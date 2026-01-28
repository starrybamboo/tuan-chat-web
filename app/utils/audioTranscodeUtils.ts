import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";

export type AudioTranscodeOptions = {
  maxDurationSec?: number;
  bitrateKbps?: number;
};

const DEFAULT_BITRATE_KBPS = 96;
const FFMPEG_CORE_VERSION = "0.12.10";
const DEFAULT_FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

let ffmpegSingletonPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

function getFfmpegCoreBaseUrl(): string {
  const env = (import.meta as any)?.env;
  const fromEnv = typeof env?.VITE_FFMPEG_CORE_BASE_URL === "string" ? env.VITE_FFMPEG_CORE_BASE_URL.trim() : "";
  return fromEnv || DEFAULT_FFMPEG_CORE_BASE_URL;
}

async function getFfmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegSingletonPromise)
    return ffmpegSingletonPromise;

  ffmpegSingletonPromise = (async () => {
    if (typeof window === "undefined") {
      throw new TypeError("当前环境不支持音频转码（需要浏览器环境）");
    }

    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);

    const baseUrl = getFfmpegCoreBaseUrl().replace(/\/+$/, "");
    const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm");

    const ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg = new FFmpeg();
    await ffmpeg.load({ coreURL, wasmURL });
    return ffmpeg;
  })();

  return ffmpegSingletonPromise;
}

function ensureOpusFileName(originalName: string): string {
  const base = (originalName || "audio").replace(/[/\\?%*:|"<>]/g, "_");
  const dot = base.lastIndexOf(".");
  if (dot > 0)
    return `${base.slice(0, dot)}.opus`;
  return `${base}.opus`;
}

export async function transcodeAudioFileToOpusOrThrow(inputFile: File, options: AudioTranscodeOptions = {}): Promise<File> {
  const bitrateKbps = options.bitrateKbps && options.bitrateKbps > 0 ? options.bitrateKbps : DEFAULT_BITRATE_KBPS;
  const maxDurationSec = options.maxDurationSec && options.maxDurationSec > 0 ? options.maxDurationSec : undefined;
  const debugEnabled = isAudioUploadDebugEnabled();
  const debugPrefix = "[tc-audio-upload]";

  const ffmpeg = await getFfmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inputSafeName = `input-${Date.now()}-${Math.random().toString(16).slice(2)}${(() => {
    const ext = inputFile.name.includes(".") ? `.${inputFile.name.split(".").pop()}` : "";
    return ext || ".bin";
  })()}`;
  const outputSafeName = `output-${Date.now()}-${Math.random().toString(16).slice(2)}.opus`;

  try {
    await ffmpeg.writeFile(inputSafeName, await fetchFile(inputFile));

    const args: string[] = ["-i", inputSafeName];
    if (maxDurationSec)
      args.push("-t", String(maxDurationSec));

    args.push(
      "-vn",
      "-map_metadata",
      "-1",
      "-c:a",
      "libopus",
      "-b:a",
      `${bitrateKbps}k`,
      "-vbr",
      "on",
      "-compression_level",
      "10",
      "-application",
      "audio",
      outputSafeName,
    );

    if (debugEnabled) {
      console.warn(`${debugPrefix} ffmpeg input`, { name: inputFile.name, type: inputFile.type, size: inputFile.size });
      console.warn(`${debugPrefix} ffmpeg args`, { bitrateKbps, maxDurationSec, args, baseUrl: getFfmpegCoreBaseUrl() });
    }

    await ffmpeg.exec(args);
    const outData = await ffmpeg.readFile(outputSafeName);
    if (typeof outData === "string")
      throw new TypeError("FFmpeg 输出数据类型异常");

    const outBytes: Uint8Array = outData;

    const outBlob = new Blob([outBytes], { type: "audio/ogg" });
    const outName = ensureOpusFileName(inputFile.name);
    const outFile = new File([outBlob], outName, { type: "audio/ogg" });
    if (debugEnabled)
      console.warn(`${debugPrefix} ffmpeg output`, { name: outFile.name, type: outFile.type, size: outFile.size });
    return outFile;
  }
  catch (error) {
    if (debugEnabled)
      console.error(`${debugPrefix} ffmpeg transcode failed`, error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`音频转码失败，已阻止上传: ${msg}`);
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

export async function transcodeAudioBlobToOpusOrThrow(inputBlob: Blob, fileName: string, options: AudioTranscodeOptions = {}): Promise<File> {
  const inputFile = new File([inputBlob], fileName || "audio", { type: inputBlob.type || "application/octet-stream" });
  return await transcodeAudioFileToOpusOrThrow(inputFile, options);
}
