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
};

const IMAGE_ORIGINAL_MAX_BYTES = 2 * 1024 * 1024;
const AUDIO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_ORIGINAL_MAX_BYTES = 200 * 1024 * 1024;
const OTHER_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
type ImageMediaProfile = (typeof MEDIA_COMPRESSION_PROFILES.image)[keyof typeof MEDIA_COMPRESSION_PROFILES.image];

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
    throw new Error("当前环境不支持图片派生文件生成");
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
    throw new Error("当前环境不支持图片派生文件生成");
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
    let best: File | null = null;
    for (const candidateQuality of candidateQualities) {
      const blob = await canvasToBlob(canvas, "image/webp", candidateQuality);
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

    if (best && best.size <= profile.maxSizeKB * 1024) {
      return best;
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

async function generateImageUploadFiles(file: File): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "image" });

  const imageMetadata = await extractImageMetadata(normalizedFile);
  const original = normalizedFile.size <= IMAGE_ORIGINAL_MAX_BYTES
    ? normalizedFile
    : normalizedFile.type === "image/gif"
      ? await rasterizeImageToWebp(normalizedFile, "high", MEDIA_COMPRESSION_PROFILES.image.high)
      : await compressImage(normalizedFile, MEDIA_COMPRESSION_PROFILES.image.high);
  assertMaxBytes(original, IMAGE_ORIGINAL_MAX_BYTES, "图片 original");

  const [low, medium, high] = await Promise.all([
    buildImageVariantFile(original, "low", MEDIA_COMPRESSION_PROFILES.image.low),
    buildImageVariantFile(original, "medium", MEDIA_COMPRESSION_PROFILES.image.medium),
    buildImageVariantFile(original, "high", MEDIA_COMPRESSION_PROFILES.image.high),
  ]);

  return {
    original,
    mediaType: "image",
    hasNovelAiMetadata: imageMetadata.hasNovelAiMetadata,
    metadata: imageMetadata.metadata,
    filesByQuality: { original, low, medium, high },
  };
}

async function generateAudioUploadFiles(file: File): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
  const original = normalizedFile.size <= AUDIO_ORIGINAL_MAX_BYTES
    ? normalizedFile
    : await transcodeAudioFileToOpusOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.audio.high);
  assertMaxBytes(original, AUDIO_ORIGINAL_MAX_BYTES, "音频 original");

  const [low, medium, high] = await Promise.all([
    transcodeAudioFileToOpusOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.audio.low),
    transcodeAudioFileToOpusOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.audio.medium),
    transcodeAudioFileToOpusOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.audio.high),
  ]);

  return {
    original,
    mediaType: "audio",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      original,
      low: ensureFileType(low, "audio/webm", "webm"),
      medium: ensureFileType(medium, "audio/webm", "webm"),
      high: ensureFileType(high, "audio/webm", "webm"),
    },
  };
}

async function generateVideoUploadFiles(file: File): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "video" });
  const original = normalizedFile.size <= VIDEO_ORIGINAL_MAX_BYTES
    ? normalizedFile
    : await transcodeVideoFileToWebmOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.video.high);
  assertMaxBytes(original, VIDEO_ORIGINAL_MAX_BYTES, "视频 original");

  const [low, medium, high] = await Promise.all([
    transcodeVideoFileToWebmOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.video.low),
    transcodeVideoFileToWebmOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.video.medium),
    transcodeVideoFileToWebmOrThrow(normalizedFile, MEDIA_COMPRESSION_PROFILES.video.high),
  ]);

  return {
    original,
    mediaType: "video",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      original,
      low: ensureFileType(low, "video/webm", "webm"),
      medium: ensureFileType(medium, "video/webm", "webm"),
      high: ensureFileType(high, "video/webm", "webm"),
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

export async function generateMediaUploadFiles(file: File): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file);
  const mediaType = inferMediaType(normalizedFile);
  if (mediaType === "image") {
    return await generateImageUploadFiles(normalizedFile);
  }
  if (mediaType === "audio") {
    return await generateAudioUploadFiles(normalizedFile);
  }
  if (mediaType === "video") {
    return await generateVideoUploadFiles(normalizedFile);
  }

  assertMaxBytes(normalizedFile, OTHER_ORIGINAL_MAX_BYTES, "文件 original");
  return {
    original: normalizedFile,
    mediaType,
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: { original: normalizedFile },
  };
}

async function putMediaTarget(target: MediaUploadTarget, file: File) {
  if (!target.uploadUrl) {
    throw new Error("上传目标缺少 uploadUrl");
  }
  const { targetUrl, headers } = resolveOssUploadTarget(target.uploadUrl, file, target.uploadHeaders);
  const response = await fetch(targetUrl, {
    method: "PUT",
    body: file,
    headers,
  });
  if (!response.ok) {
    throw new Error(`媒体文件上传失败: ${response.status}`);
  }
}

async function prepareMediaUpload(payload: GeneratedMediaUploadFiles, options: UploadMediaFileOptions = {}) {
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
  if (!result.success || !result.data?.fileId || !result.data.mediaType) {
    throw new Error(result.errMsg || "准备媒体上传失败");
  }
  return result.data;
}

async function completeMediaUpload(sessionId: number) {
  const result = await tuanchat.request.request<ApiResult<unknown>>({
    method: "POST",
    url: `/media/upload-sessions/${sessionId}/complete`,
  });
  if (!result.success) {
    throw new Error(result.errMsg || "完成媒体上传失败");
  }
}

export async function uploadMediaFile(file: File, options: UploadMediaFileOptions = {}): Promise<UploadedMediaFile> {
  const payload = await generateMediaUploadFiles(file);
  const prepared = await prepareMediaUpload(payload, options);
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
    await putMediaTarget(target, fileForQuality);
  }));
  await completeMediaUpload(prepared.sessionId);

  return {
    fileId: prepared.fileId!,
    mediaType: prepared.mediaType!,
    uploadRequired: true,
  };
}
