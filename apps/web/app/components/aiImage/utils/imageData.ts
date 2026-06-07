import { unzipSync } from "fflate";

import type {
  ImportedSourceImagePayload,
  NovelAiEmotion,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import { JPEG_REJECT_ERROR } from "@/components/aiImage/constants";

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function base64DataUrl(mime: string, bytes: Uint8Array) {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export function mimeFromFilename(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png"))
    return "image/png";
  if (lower.endsWith(".webp"))
    return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    return "image/jpeg";
  return "application/octet-stream";
}

export function extensionFromDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(String(dataUrl || ""));
  if (!match)
    return "png";

  if (match[1] === "image/webp")
    return "webp";
  if (match[1] === "image/jpeg")
    return "jpg";
  return "png";
}

export function mimeFromDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(String(dataUrl || ""));
  return match?.[1] || "application/octet-stream";
}

export function dataUrlToBase64(dataUrl: string) {
  const value = String(dataUrl || "");
  const idx = value.indexOf(",");
  if (idx < 0)
    return "";
  return value.slice(idx + 1).trim();
}

export function buildImportedSourceImagePayloadFromDataUrl(args: {
  dataUrl: string;
  name?: string;
  width?: number | null;
  height?: number | null;
}): ImportedSourceImagePayload | null {
  const dataUrl = String(args.dataUrl || "").trim();
  if (!dataUrl)
    return null;

  const imageBase64 = dataUrlToBase64(dataUrl);
  if (!imageBase64)
    return null;

  return {
    dataUrl,
    imageBase64,
    name: args.name,
    width: args.width ?? undefined,
    height: args.height ?? undefined,
  };
}

export function resolveEditorImageMode(sourceDataUrl?: string | null): "txt2img" | "img2img" {
  return buildImportedSourceImagePayloadFromDataUrl({ dataUrl: String(sourceDataUrl || "") })
    ? "img2img"
    : "txt2img";
}

export function resolveSimpleGenerateMode(mode: AiImageHistoryMode): AiImageHistoryMode {
  return mode === "infill" ? "infill" : "txt2img";
}

export function shouldKeepSimpleTagsEditor(args: {
  mode: AiImageHistoryMode;
  prompt: string;
  negativePrompt: string;
  hasConvertedDraft: boolean;
}) {
  if (args.hasConvertedDraft)
    return true;
  if (resolveSimpleGenerateMode(args.mode) === "infill")
    return true;
  return Boolean(String(args.prompt || "").trim() || String(args.negativePrompt || "").trim());
}

export function base64ToBytes(value: string) {
  const normalized = String(value || "").replace(/\s+/g, "");
  if (!normalized)
    return new Uint8Array();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function fileFromDataUrl(dataUrl: string, fileName: string) {
  return new File(
    [base64ToBytes(dataUrlToBase64(dataUrl))],
    fileName,
    { type: mimeFromDataUrl(dataUrl), lastModified: Date.now() },
  );
}

export function triggerBrowserDownload(dataUrl: string, fileName: string) {
  if (typeof document === "undefined")
    return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  if (typeof document === "undefined" || typeof URL === "undefined")
    return;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
  finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

function startsWithBytes(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length)
    return false;
  return prefix.every((byte, index) => bytes[index] === byte);
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

function allImagesFromZip(zipBytes: Uint8Array) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names
    .filter(name => /\.(?:png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (!preferred.length) {
    const jpegEntry = names.find(name => /\.jpe?g$/i.test(name));
    if (jpegEntry)
      throw new Error(JPEG_REJECT_ERROR);
    throw new Error("ZIP 解包失败：未找到 PNG/WebP 文件");
  }

  return preferred.map((name) => {
    return base64DataUrl(mimeFromFilename(name), files[name]);
  });
}

export function extractImageDataUrlsFromBinary(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    throw new Error(JPEG_REJECT_ERROR);

  const detected = detectBinaryDataUrl(bytes);
  if (detected)
    return [detected];

  if (looksLikeZip(bytes))
    return allImagesFromZip(bytes);

  return [];
}

export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("读取图片失败"));
    img.src = dataUrl;
  });
}

export function formatDirectorEmotionLabel(value: NovelAiEmotion) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

export async function readImagePixels(dataUrl: string): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const img = await loadImageElement(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new Error("无法读取图片像素");
  context.drawImage(img, 0, 0, width, height);
  return {
    width,
    height,
    data: context.getImageData(0, 0, width, height).data,
  };
}
