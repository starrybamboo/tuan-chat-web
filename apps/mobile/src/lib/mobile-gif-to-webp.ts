import type { ParsedFrame } from "gifuct-js";
import type { WebPAnimationFrame, WebPModule } from "wasm-webp/dist/esm/webp-wasm";

import { Asset } from "expo-asset";
import { File as ExpoFile, Paths } from "expo-file-system";
import { decompressFrames, parseGIF } from "gifuct-js";
import { Platform } from "react-native";
import createWebpModule from "wasm-webp/dist/esm/webp-wasm";
import webpWasmAsset from "wasm-webp/dist/esm/webp-wasm.wasm";

import type { MobileMessageAttachment } from "../features/messages/mobileMessageAttachment";
import type { ImageDerivativeResult } from "./mobile-image-compress";

const GIF_MIME_TYPE = "image/gif";
const WEBP_MIME_TYPE = "image/webp";
const DEFAULT_FRAME_DURATION_MS = 100;
const DEFAULT_WEBP_FRAME_CONFIG = { lossless: 0, quality: 90 };
const MAX_ORIGINAL_WEBP_BYTES = 3 * 1024 * 1024;
const WEBP_ANIMATION_QUALITIES = [90, 75, 60, 45, 30];

let webpModulePromise: Promise<WebPModule> | null = null;

function normalizeMimeType(mimeType: string | null | undefined): string {
  return String(mimeType ?? "").trim().toLowerCase().split(";", 1)[0] ?? "";
}

function fileNameExtension(fileName: string): string | null {
  return fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? null;
}

export function isGifAttachment(attachment: Pick<MobileMessageAttachment, "fileName" | "mimeType">): boolean {
  return normalizeMimeType(attachment.mimeType) === GIF_MIME_TYPE || fileNameExtension(attachment.fileName) === "gif";
}

function createAnimatedWebpFileName(fileName: string): string {
  const baseName = fileName.trim().replace(/\.[^.]+$/, "") || "sticker";
  return `${baseName}.webp`;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("读取 GIF 文件失败。");
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  return await new ExpoFile(uri).bytes();
}

async function writeBytesToCache(bytes: Uint8Array, fileName: string): Promise<string> {
  if (Platform.OS === "web" && typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(new Blob([bytesToArrayBuffer(bytes)], { type: WEBP_MIME_TYPE }));
  }

  if (!Paths.cache) {
    throw new Error("当前环境缺少可写缓存目录。");
  }

  const safeName = fileName.replace(/[^\w.-]+/g, "_");
  const file = new ExpoFile(Paths.cache, `animated-webp-${Date.now()}-${safeName}`);
  file.write(bytes);
  return file.uri;
}

async function readBundledWebpWasm(): Promise<Uint8Array> {
  const asset = Asset.fromModule(webpWasmAsset);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("GIF 动图转码模块加载失败。");
  }
  return await readBytes(uri);
}

async function loadWebpModule(): Promise<WebPModule> {
  if (typeof WebAssembly !== "object") {
    throw new Error("当前移动端运行时不支持 GIF 动图转 WebP。");
  }
  if (!webpModulePromise) {
    webpModulePromise = readBundledWebpWasm().then(wasmBinary => createWebpModule({ wasmBinary }));
  }
  return await webpModulePromise;
}

function drawPatch(canvas: Uint8Array, frame: ParsedFrame, width: number): void {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims;
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      const patchOffset = (y * frameWidth + x) * 4;
      const alpha = frame.patch[patchOffset + 3] ?? 0;
      if (alpha === 0) {
        continue;
      }
      const targetOffset = ((top + y) * width + left + x) * 4;
      canvas[targetOffset] = frame.patch[patchOffset] ?? 0;
      canvas[targetOffset + 1] = frame.patch[patchOffset + 1] ?? 0;
      canvas[targetOffset + 2] = frame.patch[patchOffset + 2] ?? 0;
      canvas[targetOffset + 3] = alpha;
    }
  }
}

function clearFrameRect(canvas: Uint8Array, frame: ParsedFrame, width: number): void {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims;
  for (let y = 0; y < frameHeight; y++) {
    const start = ((top + y) * width + left) * 4;
    canvas.fill(0, start, start + frameWidth * 4);
  }
}

function composeGifFrames(frames: ParsedFrame[], width: number, height: number, quality: number): WebPAnimationFrame[] {
  const canvas = new Uint8Array(width * height * 4);
  return frames.map((frame) => {
    const restoreSnapshot = frame.disposalType === 3 ? canvas.slice() : null;
    drawPatch(canvas, frame, width);
    const data = canvas.slice();
    if (frame.disposalType === 2) {
      clearFrameRect(canvas, frame, width);
    }
    else if (restoreSnapshot) {
      canvas.set(restoreSnapshot);
    }
    return {
      data,
      duration: Math.max(10, frame.delay || DEFAULT_FRAME_DURATION_MS),
      config: { ...DEFAULT_WEBP_FRAME_CONFIG, quality },
    };
  });
}

async function encodeAnimatedWebp(width: number, height: number, frames: WebPAnimationFrame[]): Promise<Uint8Array> {
  const module = await loadWebpModule();
  const frameVector = new module.VectorWebPAnimationFrame();
  try {
    frames.forEach((frame) => {
      frameVector.push_back({
        data: frame.data,
        duration: frame.duration,
        config: frame.config ?? DEFAULT_WEBP_FRAME_CONFIG,
        has_config: Boolean(frame.config),
      });
    });
    const encoded = module.encodeAnimation(width, height, true, frameVector);
    if (!encoded || encoded.length === 0) {
      throw new Error("GIF 动图转 WebP 失败。");
    }
    return encoded;
  }
  finally {
    frameVector.delete?.();
  }
}

export async function convertGifAttachmentToAnimatedWebp(
  attachment: Pick<MobileMessageAttachment, "fileName" | "uri">,
): Promise<ImageDerivativeResult> {
  const gifBytes = await readBytes(attachment.uri);
  const parsedGif = parseGIF(bytesToArrayBuffer(gifBytes));
  const width = parsedGif.lsd.width;
  const height = parsedGif.lsd.height;
  if (!(width > 0) || !(height > 0)) {
    throw new Error("读取 GIF 尺寸失败。");
  }

  const frames = decompressFrames(parsedGif, true);
  if (frames.length === 0) {
    throw new Error("GIF 文件没有可转码的动画帧。");
  }

  let encoded: Uint8Array | null = null;
  for (const quality of WEBP_ANIMATION_QUALITIES) {
    const next = await encodeAnimatedWebp(width, height, composeGifFrames(frames, width, height, quality));
    encoded = next;
    if (next.byteLength <= MAX_ORIGINAL_WEBP_BYTES) {
      break;
    }
  }
  if (!encoded || encoded.byteLength > MAX_ORIGINAL_WEBP_BYTES) {
    throw new Error("GIF 动图转 WebP 后仍超过 3MB。");
  }
  const fileName = createAnimatedWebpFileName(attachment.fileName);
  return {
    fileName,
    mimeType: WEBP_MIME_TYPE,
    size: encoded.byteLength,
    uri: await writeBytesToCache(encoded, fileName),
  };
}
