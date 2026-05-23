import type { MediaQuality, MediaType } from "@/utils/imgCompressUtils";
import type { OssUploadHeaders } from "@/utils/ossUploadTarget";

import { transcodeAudioFileToOpusOrThrow } from "@/utils/audioTranscodeUtils";
import { compressImage, MEDIA_COMPRESSION_PROFILES } from "@/utils/imgCompressUtils";
import { inferMediaTypeFromMimeType, normalizeFileMimeType, normalizeMimeType } from "@/utils/mediaMime";
import { extractNovelAiMetadataFromPngBytes, extractNovelAiMetadataFromWebpBytes } from "@/utils/novelaiImageMetadata";
import { resolveOssUploadTarget } from "@/utils/ossUploadTarget";
import { transcodeVideoFileToWebmOrThrow } from "@/utils/videoTranscodeUtils";

import { tuanchat } from "../../api/instance";

type MediaUploadTarget = {
  quality?: string;
  objectKey?: string;
  uploadUrl?: string;
  uploadHeaders?: OssUploadHeaders;
};

type MediaPrepareUploadResponse = {
  uploadRequired?: boolean;
  fileId?: number;
  mediaType?: MediaType;
  status?: string;
  sessionId?: number;
  uploadTargets?: Record<string, MediaUploadTarget>;
};

type ApiResult<T> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

export type GeneratedMediaUploadFiles = {
  original: File;
  mediaType: MediaType;
  hasNovelAiMetadata: boolean;
  metadata: Record<string, unknown>;
  filesByQuality: Partial<Record<MediaQuality, File>>;
};

export type UploadedMediaFile = {
  fileId: number;
  mediaType: MediaType;
  uploadRequired: boolean;
};

export type UploadMediaFileOptions = {
  scene?: number;
  signal?: AbortSignal;
};

const IMAGE_ORIGINAL_MAX_BYTES = 2 * 1024 * 1024;
const AUDIO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_ORIGINAL_MAX_BYTES = 200 * 1024 * 1024;
const OTHER_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
type ImageMediaProfile = (typeof MEDIA_COMPRESSION_PROFILES.image)[keyof typeof MEDIA_COMPRESSION_PROFILES.image];

function isChatroomUploadScene(scene: number | undefined): boolean {
  return scene === 1;
}

function createUploadAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("媒体上传已取消", "AbortError");
  }
  const error = new Error("媒体上传已取消");
  error.name = "AbortError";
  return error;
}

function throwIfUploadAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createUploadAbortError();
  }
}

export function inferMediaType(file: File): MediaType {
  return inferMediaTypeFromMimeType(file.type);
}

function assertMaxBytes(file: File, maxBytes: number, label: string) {
  if (file.size <= maxBytes)
    return;
  const mb = (file.size / 1024 / 1024).toFixed(1);
  const maxMb = Math.round(maxBytes / 1024 / 1024);
  throw new Error(`${label} 文件过大（${mb}MB），上限 ${maxMb}MB`);
}

function ensureFileType(file: File, type: string, extension: string) {
  if (file.type === type && file.name.toLowerCase().endsWith(`.${extension}`)) {
    return file;
  }
  const baseName = file.name.replace(/(\.[^.]+)?$/, "");
  return new File([file], `${baseName}.${extension}`, {
    type,
    lastModified: file.lastModified,
  });
}

function buildDerivedImageFileName(file: File, quality: MediaQuality) {
  const baseName = file.name.replace(/(\.[^.]+)?$/, "");
  return `${baseName}_${quality}.webp`;
}

async function createDrawableImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof globalThis.createImageBitmap === "function") {
    return await globalThis.createImageBitmap(file);
  }
  if (typeof document === "undefined") {
    throw new TypeError("当前环境不支持图片派生文件生成");
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解码失败"));
    };
    image.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("图片派生文件生成失败"));
    }, type, quality);
  });
}

async function rasterizeImageToWebp(file: File, quality: Exclude<MediaQuality, "original">, profile: ImageMediaProfile): Promise<File> {
  if (typeof document === "undefined") {
    throw new TypeError("当前环境不支持图片派生文件生成");
  }

  const image = await createDrawableImage(file);
  try {
    const sourceWidth = Math.max(1, "naturalWidth" in image ? image.naturalWidth : image.width);
    const sourceHeight = Math.max(1, "naturalHeight" in image ? image.naturalHeight : image.height);
    const maxSize = Math.max(1, profile.maxWidthOrHeight);
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("当前环境不支持图片派生文件生成");
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const candidateQualities = [
      profile.quality,
      Math.max(0.05, profile.quality * 0.85),
      Math.max(0.05, profile.quality * 0.7),
      Math.max(0.05, profile.quality * 0.55),
      Math.max(0.05, profile.quality * 0.4),
    ];

    const maxRounds = 5;
    let currentCanvas = canvas;
    let best: File | null = null;

    for (let round = 0; round < maxRounds; round++) {
      for (const candidateQuality of candidateQualities) {
        const blob = await canvasToBlob(currentCanvas, "image/webp", candidateQuality);
        const next = new File([blob], buildDerivedImageFileName(file, quality), {
          type: "image/webp",
          lastModified: file.lastModified,
        });
        if (!best || next.size < best.size) {
          best = next;
        }
        if (next.size <= profile.maxSizeKB * 1024) {
          return next;
        }
      }

      if (best!.size <= profile.maxSizeKB * 1024) {
        return best!;
      }

      // 用当前最优结果作为新输入，缩小尺寸后再压一轮
      const img = await createDrawableImage(best!);
      const prevWidth = currentCanvas.width;
      const prevHeight = currentCanvas.height;
      const shrink = 0.75;
      const nextWidth = Math.max(1, Math.round(prevWidth * shrink));
      const nextHeight = Math.max(1, Math.round(prevHeight * shrink));
      currentCanvas = document.createElement("canvas");
      currentCanvas.width = nextWidth;
      currentCanvas.height = nextHeight;
      const ctx = currentCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, nextWidth, nextHeight);
      if ("close" in img && typeof img.close === "function") {
        img.close();
      }
    }

    throw new Error(`${quality} 图片派生文件超过 ${profile.maxSizeKB}KB`);
  }
  finally {
    if ("close" in image && typeof image.close === "function") {
      image.close();
    }
  }
}

async function buildImageVariantFile(
  file: File,
  quality: Exclude<MediaQuality, "original">,
  profile: ImageMediaProfile,
): Promise<File> {
  if (file.type === "image/gif") {
    // GIF 的 original 可以保留动画；展示档统一取首帧生成 WebP，满足媒体库固定三档路径。
    return await rasterizeImageToWebp(file, quality, profile);
  }
  return await compressImage(file, profile);
}

async function extractImageMetadata(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const novelAi = extractNovelAiMetadataFromPngBytes(bytes) || extractNovelAiMetadataFromWebpBytes(bytes);
  return {
    hasNovelAiMetadata: Boolean(novelAi),
    metadata: {
      hasNovelAiMetadata: Boolean(novelAi),
      novelAiMetadataSource: novelAi?.source,
    },
  };
}

async function generateImageUploadFiles(file: File, scene?: number): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "image" });
  const isChatroom = isChatroomUploadScene(scene);

  const imageMetadataPromise = extractImageMetadata(normalizedFile);
  const original = isChatroom
    ? normalizedFile
    : await (async () => {
        const result = normalizedFile.size <= IMAGE_ORIGINAL_MAX_BYTES
          ? normalizedFile
          : normalizedFile.type === "image/gif"
            ? await rasterizeImageToWebp(normalizedFile, "medium", MEDIA_COMPRESSION_PROFILES.image.high)
            : await compressImage(normalizedFile, MEDIA_COMPRESSION_PROFILES.image.high);
        assertMaxBytes(result, IMAGE_ORIGINAL_MAX_BYTES, "图片 original");
        return result;
      })();
  const imageMetadata = await imageMetadataPromise;

  const low = await buildImageVariantFile(original, "low", MEDIA_COMPRESSION_PROFILES.image.low);
  const medium = await buildImageVariantFile(original, "medium", MEDIA_COMPRESSION_PROFILES.image.medium);

  return {
    original,
    mediaType: "image",
    hasNovelAiMetadata: imageMetadata.hasNovelAiMetadata,
    metadata: imageMetadata.metadata,
    filesByQuality: isChatroom ? { low, medium } : { original, low, medium },
  };
}

async function generateAudioUploadFiles(file: File, scene?: number): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
  const isChatroom = isChatroomUploadScene(scene);

  if (normalizedFile.type === "audio/webm") {
    const webmFile = ensureFileType(normalizedFile, "audio/webm", "webm");
    return {
      original: webmFile,
      mediaType: "audio",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: isChatroom
        ? { low: webmFile }
        : { original: webmFile, low: webmFile, medium: webmFile },
    };
  }

  const original = normalizedFile;
  const low = await transcodeAudioFileToOpusOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.audio.low, isolated: true });
  const medium = isChatroom
    ? undefined
    : await transcodeAudioFileToOpusOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.audio.medium, isolated: true });

  if (!isChatroom) {
    const originalTranscoded = normalizedFile.size <= AUDIO_ORIGINAL_MAX_BYTES
      ? normalizedFile
      : await transcodeAudioFileToOpusOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.audio.high, isolated: true });
    assertMaxBytes(originalTranscoded, AUDIO_ORIGINAL_MAX_BYTES, "音频 original");
    return {
      original: originalTranscoded,
      mediaType: "audio",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: {
        original: originalTranscoded,
        low: ensureFileType(low, "audio/webm", "webm"),
        medium: ensureFileType(medium!, "audio/webm", "webm"),
      },
    };
  }

  return {
    original,
    mediaType: "audio",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      low: ensureFileType(low, "audio/webm", "webm"),
    },
  };
}

async function generateVideoUploadFiles(file: File, scene?: number): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "video" });
  const isChatroom = isChatroomUploadScene(scene);

  if (normalizedFile.type === "video/webm") {
    const webmFile = ensureFileType(normalizedFile, "video/webm", "webm");
    return {
      original: webmFile,
      mediaType: "video",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: isChatroom
        ? { low: webmFile }
        : { original: webmFile, low: webmFile, medium: webmFile },
    };
  }

  const original = normalizedFile;
  const low = await transcodeVideoFileToWebmOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.video.low, isolated: true });
  const medium = isChatroom
    ? undefined
    : await transcodeVideoFileToWebmOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.video.medium, isolated: true });

  if (!isChatroom) {
    const originalTranscoded = normalizedFile.size <= VIDEO_ORIGINAL_MAX_BYTES
      ? normalizedFile
      : await transcodeVideoFileToWebmOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.video.high, isolated: true });
    assertMaxBytes(originalTranscoded, VIDEO_ORIGINAL_MAX_BYTES, "视频 original");
    return {
      original: originalTranscoded,
      mediaType: "video",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: {
        original: originalTranscoded,
        low: ensureFileType(low, "video/webm", "webm"),
        medium: ensureFileType(medium!, "video/webm", "webm"),
      },
    };
  }

  return {
    original,
    mediaType: "video",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      low: ensureFileType(low, "video/webm", "webm"),
    },
  };
}

export async function calculateFileSha256(file: File) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("当前环境不支持 SHA-256 计算");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateMediaUploadFiles(file: File, scene?: number): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file);
  const mediaType = inferMediaType(normalizedFile);
  if (mediaType === "image") {
    return await generateImageUploadFiles(normalizedFile, scene);
  }
  if (mediaType === "audio") {
    return await generateAudioUploadFiles(normalizedFile, scene);
  }
  if (mediaType === "video") {
    return await generateVideoUploadFiles(normalizedFile, scene);
  }

  assertMaxBytes(normalizedFile, OTHER_ORIGINAL_MAX_BYTES, "文件 original");
  return {
    original: normalizedFile,
    mediaType,
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: isChatroomUploadScene(scene) ? { low: normalizedFile } : { original: normalizedFile, low: normalizedFile },
  };
}

export async function uploadGeneratedMediaFiles(payload: GeneratedMediaUploadFiles, options: UploadMediaFileOptions = {}): Promise<UploadedMediaFile> {
  throwIfUploadAborted(options.signal);
  const prepared = await prepareMediaUpload(payload, options);
  throwIfUploadAborted(options.signal);
  if (!prepared.uploadRequired) {
    return {
      fileId: prepared.fileId!,
      mediaType: prepared.mediaType!,
      uploadRequired: false,
    };
  }
  if (!prepared.sessionId || !prepared.uploadTargets) {
    throw new Error("媒体上传响应缺少上传会话");
  }

  await Promise.all(Object.entries(prepared.uploadTargets).map(async ([quality, target]) => {
    const fileForQuality = payload.filesByQuality[quality as MediaQuality];
    if (!fileForQuality) {
      throw new Error(`缺少 ${quality} 上传文件`);
    }
    await putMediaTarget(target, fileForQuality, options.signal);
  }));
  throwIfUploadAborted(options.signal);
  await completeMediaUpload(prepared.sessionId, options.signal);

  return {
    fileId: prepared.fileId!,
    mediaType: prepared.mediaType!,
    uploadRequired: true,
  };
}

async function putMediaTarget(target: MediaUploadTarget, file: File, signal?: AbortSignal) {
  throwIfUploadAborted(signal);
  if (!target.uploadUrl) {
    throw new Error("上传目标缺少 uploadUrl");
  }
  const { targetUrl, headers } = resolveOssUploadTarget(target.uploadUrl, file, target.uploadHeaders);
  const response = await fetch(targetUrl, {
    method: "PUT",
    body: file,
    headers,
    signal,
  });
  throwIfUploadAborted(signal);
  if (!response.ok) {
    throw new Error(`媒体文件上传失败: ${response.status}`);
  }
}

async function prepareMediaUpload(payload: GeneratedMediaUploadFiles, options: UploadMediaFileOptions = {}) {
  throwIfUploadAborted(options.signal);
  const result = await tuanchat.request.request<ApiResult<MediaPrepareUploadResponse>>({
    method: "POST",
    url: "/media/prepare-upload",
    body: {
      fileName: payload.original.name,
      scene: options.scene,
      sha256: await calculateFileSha256(payload.original),
      sizeBytes: payload.original.size,
      mimeType: normalizeMimeType(payload.original.type) || "application/octet-stream",
      contentType: normalizeMimeType(payload.original.type) || "application/octet-stream",
      hasNovelAiMetadata: payload.hasNovelAiMetadata,
      metadata: payload.metadata,
    },
    mediaType: "application/json",
  });
  throwIfUploadAborted(options.signal);
  if (!result.success || !result.data?.fileId || !result.data.mediaType) {
    throw new Error(result.errMsg || "准备媒体上传失败");
  }
  return result.data;
}

async function completeMediaUpload(sessionId: number, signal?: AbortSignal) {
  throwIfUploadAborted(signal);
  const result = await tuanchat.request.request<ApiResult<unknown>>({
    method: "POST",
    url: `/media/upload-sessions/${sessionId}/complete`,
  });
  throwIfUploadAborted(signal);
  if (!result.success) {
    throw new Error(result.errMsg || "完成媒体上传失败");
  }
}

export async function uploadMediaFile(file: File, options: UploadMediaFileOptions = {}): Promise<UploadedMediaFile> {
  throwIfUploadAborted(options.signal);
  const payload = await generateMediaUploadFiles(file, options.scene);
  throwIfUploadAborted(options.signal);
  return await uploadGeneratedMediaFiles(payload, options);
}
