import type { MediaQuality, MediaType } from "@/utils/media/imgCompressUtils";
import type { OssUploadHeaders } from "@/utils/media/ossUploadTarget";

import { transcodeAudioFileToOpusOrThrow } from "@/utils/media/audioTranscodeUtils";
import { compressImage, MEDIA_COMPRESSION_PROFILES } from "@/utils/media/imgCompressUtils";
import { inferMediaTypeFromMimeType, normalizeFileMimeType, normalizeMimeType } from "@/utils/media/mediaMime";
import { extractNovelAiMetadataFromPngBytes, extractNovelAiMetadataFromWebpBytes } from "@/utils/media/novelaiImageMetadata";
import { resolveOssUploadTarget } from "@/utils/media/ossUploadTarget";
import { transcodeVideoFileToWebmOrThrow } from "@/utils/media/videoTranscodeUtils";

import { tuanchat } from "../../../api/instance";

type MediaUploadTarget = {
  quality?: string;
  objectKey?: string;
  uploadUrl?: string;
  uploadHeaders?: OssUploadHeaders;
};

export type GeneratedMediaUploadFiles = {
  original: File;
  mediaType: MediaType;
  hasNovelAiMetadata: boolean;
  metadata: Record<string, unknown>;
  filesByQuality: Partial<Record<MediaQuality, File>>;
  deferredFilesByQuality?: Partial<Record<MediaQuality, () => Promise<File | undefined>>>;
};

export type UploadedMediaFile = {
  fileId: number;
  mediaType: MediaType;
  uploadRequired: boolean;
  ensurePrimaryCompletion?: () => Promise<void>;
  availableQualities?: string[];
  pendingQualities?: string[];
  failedQualities?: string[];
  degraded?: boolean;
  failedTargets?: FailedUploadTarget[];
};

export type UploadMediaFileOptions = {
  completeAfterPrimaryQuality?: boolean;
  deferPrimaryCompletion?: boolean;
  retryPolicy?: Partial<UploadTargetRetryPolicy>;
  scene?: number;
  signal?: AbortSignal;
};

export type FailedUploadTarget = {
  quality: string;
  error: string;
  retryable: boolean;
  credentialExpired?: boolean;
};

export type BatchUploadItemStatus = "queued" | "uploading" | "succeeded" | "failed";

export type BatchUploadItem = {
  localId: string;
  fileName: string;
  file: File;
  status: BatchUploadItemStatus;
  fileId?: number;
  error?: string;
  retryCount: number;
};

type MediaCompleteUploadRequest = {
  availableQualities: string[];
  pendingQualities: string[];
  failedQualities: string[];
  degraded: boolean;
  failedTargets?: FailedUploadTarget[];
};

type UploadTargetRetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
};

const IMAGE_ORIGINAL_MAX_BYTES = 3 * 1024 * 1024;
const AUDIO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_ORIGINAL_MAX_BYTES = 200 * 1024 * 1024;
const OTHER_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_UPLOAD_TARGET_RETRY_POLICY: UploadTargetRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  jitter: true,
};
const DERIVATIVE_UPLOAD_IDLE_DELAY_MS = 200;
const DERIVATIVE_UPLOAD_MAX_WAIT_MS = 1500;
const DERIVATIVE_UPLOAD_QUALITY_ORDER = ["low", "medium", "high"] as const;
let derivativeUploadQueue: Promise<void> = Promise.resolve();
type ImageMediaProfile = (typeof MEDIA_COMPRESSION_PROFILES.image)[keyof typeof MEDIA_COMPRESSION_PROFILES.image];
type RasterizeImageWorkerResponse = {
  blob?: Blob;
  error?: string;
};

class MediaTargetUploadError extends Error {
  public readonly status?: number;
  public readonly retryable: boolean;
  public readonly credentialExpired: boolean;

  constructor(message: string, options: {
    credentialExpired?: boolean;
    retryable?: boolean;
    status?: number;
  } = {}) {
    super(message);
    this.name = "MediaTargetUploadError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.credentialExpired = options.credentialExpired ?? false;
  }
}

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

export function createBatchUploadItems(files: File[]): BatchUploadItem[] {
  return files.map((file, index) => ({
    localId: createBatchUploadLocalId(file, index),
    fileName: file.name || `file-${index + 1}`,
    file,
    status: "queued",
    retryCount: 0,
  }));
}

function createBatchUploadLocalId(file: File, index: number): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return randomId;
  }
  return `${Date.now()}-${index}-${file.name || "file"}-${file.size}-${file.lastModified}`;
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

async function rasterizeImageInWorker(file: File, quality: MediaQuality, profile: ImageMediaProfile): Promise<File | null> {
  if (
    typeof Worker === "undefined"
    || typeof OffscreenCanvas === "undefined"
    || typeof globalThis.createImageBitmap !== "function"
  ) {
    return null;
  }

  let bitmap: ImageBitmap | null = await globalThis.createImageBitmap(file);
  let transferred = false;
  try {
    const worker = new Worker(new URL("./imageRasterizeWorker.ts", import.meta.url), { type: "module" });
    const fileName = buildDerivedImageFileName(file, quality);
    const blob = await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<RasterizeImageWorkerResponse>) => {
        worker.terminate();
        if (event.data.error || !event.data.blob) {
          reject(new Error(event.data.error || "图片派生文件生成失败"));
          return;
        }
        resolve(event.data.blob);
      };
      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event.message || "图片派生 Worker 执行失败"));
      };
      worker.postMessage({
        bitmap,
        profile: {
          maxSizeKB: profile.maxSizeKB,
          maxWidthOrHeight: profile.maxWidthOrHeight,
          quality: profile.quality,
        },
      }, [bitmap!]);
      transferred = true;
      bitmap = null;
    });

    return new File([blob], fileName, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  }
  catch (error) {
    console.warn("[媒体上传] 图片 Worker 光栅化失败，回退主线程 canvas", {
      name: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  finally {
    if (!transferred && bitmap) {
      bitmap.close();
    }
  }
}

async function rasterizeImageToWebp(file: File, quality: MediaQuality, profile: ImageMediaProfile): Promise<File> {
  const workerResult = await rasterizeImageInWorker(file, quality, profile);
  if (workerResult) {
    return workerResult;
  }

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
    // GIF 统一取首帧转 WebP，避免 original 混入原格式。
    return await rasterizeImageToWebp(file, quality, profile);
  }
  return await compressImage(file, profile);
}

async function buildImageVariantFileWhenUseful(
  original: File,
  quality: Exclude<MediaQuality, "original">,
  profile: ImageMediaProfile,
): Promise<File | undefined> {
  if (original.size <= profile.maxSizeKB * 1024) {
    return undefined;
  }
  return await buildImageVariantFile(original, quality, profile);
}

async function buildImageOriginalFile(file: File): Promise<File> {
  const profile = MEDIA_COMPRESSION_PROFILES.image.original;
  return file.type === "image/gif"
    ? await rasterizeImageToWebp(file, "original", profile)
    : await compressImage(file, profile);
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

  const imageMetadataPromise = extractImageMetadata(normalizedFile);
  const originalPromise = (async () => {
    const result = await buildImageOriginalFile(normalizedFile);
    assertMaxBytes(result, IMAGE_ORIGINAL_MAX_BYTES, "图片 original");
    return result;
  })();
  const [original, imageMetadata] = await Promise.all([originalPromise, imageMetadataPromise]);

  const [low, medium] = await Promise.all([
    buildImageVariantFileWhenUseful(original, "low", MEDIA_COMPRESSION_PROFILES.image.low),
    buildImageVariantFileWhenUseful(original, "medium", MEDIA_COMPRESSION_PROFILES.image.medium),
  ]);
  const filesByQuality = { original, low, medium };

  return {
    original,
    mediaType: "image",
    hasNovelAiMetadata: imageMetadata.hasNovelAiMetadata,
    metadata: {
      ...imageMetadata.metadata,
      uploadedQualities: Object.entries(filesByQuality)
        .filter(([, value]) => Boolean(value))
        .map(([quality]) => quality),
    },
    filesByQuality,
  };
}

export async function generateOriginalFirstImageUploadFiles(file: File, _scene?: number): Promise<GeneratedMediaUploadFiles> {
  const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "image" });

  const imageMetadataPromise = extractImageMetadata(normalizedFile);
  const originalPromise = (async () => {
    const result = await buildImageOriginalFile(normalizedFile);
    assertMaxBytes(result, IMAGE_ORIGINAL_MAX_BYTES, "图片 original");
    return result;
  })();
  const [original, imageMetadata] = await Promise.all([originalPromise, imageMetadataPromise]);
  const deferredFilesByQuality: GeneratedMediaUploadFiles["deferredFilesByQuality"] = {};
  if (original.size > MEDIA_COMPRESSION_PROFILES.image.low.maxSizeKB * 1024) {
    deferredFilesByQuality.low = async () => await buildImageVariantFile(original, "low", MEDIA_COMPRESSION_PROFILES.image.low);
  }
  if (original.size > MEDIA_COMPRESSION_PROFILES.image.medium.maxSizeKB * 1024) {
    deferredFilesByQuality.medium = async () => await buildImageVariantFile(original, "medium", MEDIA_COMPRESSION_PROFILES.image.medium);
  }
  if (original.size > MEDIA_COMPRESSION_PROFILES.image.high.maxSizeKB * 1024) {
    deferredFilesByQuality.high = async () => await buildImageVariantFile(original, "high", MEDIA_COMPRESSION_PROFILES.image.high);
  }
  const uploadedQualities = ["original", ...Object.keys(deferredFilesByQuality)];

  return {
    original,
    mediaType: "image",
    hasNovelAiMetadata: imageMetadata.hasNovelAiMetadata,
    metadata: {
      ...imageMetadata.metadata,
      uploadedQualities,
    },
    filesByQuality: {
      original,
    },
    deferredFilesByQuality,
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
  const lowPromise = transcodeAudioFileToOpusOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.audio.low, isolated: true });
  const mediumPromise = isChatroom
    ? Promise.resolve<File | undefined>(undefined)
    : transcodeAudioFileToOpusOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.audio.medium, isolated: true });

  if (!isChatroom) {
    const originalPromise = normalizedFile.size <= AUDIO_ORIGINAL_MAX_BYTES
      ? Promise.resolve(normalizedFile)
      : mediumPromise.then((file) => {
          if (!file) {
            throw new Error("音频 original 转码失败");
          }
          return file;
        });
    const [originalTranscoded, low, medium] = await Promise.all([originalPromise, lowPromise, mediumPromise]);
    if (!medium) {
      throw new Error("音频 medium 转码失败");
    }
    assertMaxBytes(originalTranscoded, AUDIO_ORIGINAL_MAX_BYTES, "音频 original");
    return {
      original: originalTranscoded,
      mediaType: "audio",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: {
        original: originalTranscoded,
        low: ensureFileType(low, "audio/webm", "webm"),
        medium: ensureFileType(medium, "audio/webm", "webm"),
      },
    };
  }

  return {
    original,
    mediaType: "audio",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      low: ensureFileType(await lowPromise, "audio/webm", "webm"),
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
  const lowPromise = transcodeVideoFileToWebmOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.video.low, isolated: true });
  const mediumPromise = isChatroom
    ? Promise.resolve<File | undefined>(undefined)
    : transcodeVideoFileToWebmOrThrow(normalizedFile, { ...MEDIA_COMPRESSION_PROFILES.video.medium, isolated: true });

  if (!isChatroom) {
    const originalPromise = normalizedFile.size <= VIDEO_ORIGINAL_MAX_BYTES
      ? Promise.resolve(normalizedFile)
      : mediumPromise.then((file) => {
          if (!file) {
            throw new Error("视频 original 转码失败");
          }
          return file;
        });
    const [originalTranscoded, low, medium] = await Promise.all([originalPromise, lowPromise, mediumPromise]);
    if (!medium) {
      throw new Error("视频 medium 转码失败");
    }
    assertMaxBytes(originalTranscoded, VIDEO_ORIGINAL_MAX_BYTES, "视频 original");
    return {
      original: originalTranscoded,
      mediaType: "video",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: {
        original: originalTranscoded,
        low: ensureFileType(low, "video/webm", "webm"),
        medium: ensureFileType(medium, "video/webm", "webm"),
      },
    };
  }

  return {
    original,
    mediaType: "video",
    hasNovelAiMetadata: false,
    metadata: {},
    filesByQuality: {
      low: ensureFileType(await lowPromise, "video/webm", "webm"),
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
    return await generateImageUploadFiles(normalizedFile);
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
      mediaType: payload.mediaType,
      uploadRequired: false,
      degraded: false,
    };
  }
  if (!prepared.sessionId || !prepared.uploadTargets) {
    throw new Error("媒体上传响应缺少上传会话");
  }

  const retryPolicy = normalizeRetryPolicy(options.retryPolicy);
  const targetEntries = Object.entries(prepared.uploadTargets);
  const primaryQuality = resolvePrimaryUploadQuality(payload, targetEntries);
  const availableQualities: string[] = [];
  const pendingQualities: string[] = [];
  const failedQualities: string[] = [];
  const failedTargets: FailedUploadTarget[] = [];

  const primaryTarget = prepared.uploadTargets[primaryQuality];
  const primaryFile = payload.filesByQuality[primaryQuality as MediaQuality];
  if (!primaryTarget || !primaryFile) {
    throw new Error(`缺少 ${primaryQuality} 上传文件`);
  }
  await putMediaTargetWithRetry(primaryTarget, primaryFile, primaryQuality, options.signal, retryPolicy);
  availableQualities.push(primaryQuality);

  if (options.completeAfterPrimaryQuality) {
    const derivativeEntries = sortDerivativeUploadEntries(
      targetEntries.filter(([quality]) => quality !== primaryQuality),
    );
    const derivativeQualities = derivativeEntries.map(([quality]) => quality);
    const primaryCompleteRequest: MediaCompleteUploadRequest = {
      availableQualities,
      pendingQualities: derivativeQualities,
      failedQualities: [],
      degraded: derivativeQualities.length > 0,
      failedTargets: [],
    };
    let primaryCompletionPromise: Promise<void> | undefined;
    const ensurePrimaryCompletion = options.deferPrimaryCompletion
      ? () => {
          primaryCompletionPromise ??= completeMediaUpload(prepared.sessionId!, primaryCompleteRequest, options.signal)
            .then(() => undefined);
          return primaryCompletionPromise;
        }
      : undefined;
    if (ensurePrimaryCompletion) {
      uploadDerivativeTargetsInBackground({
        availableQualities: [...availableQualities],
        completeSessionId: prepared.sessionId,
        entries: derivativeEntries,
        payload,
        retryPolicy,
        ensurePrimaryCompletion,
      });

      return {
        fileId: prepared.fileId!,
        mediaType: payload.mediaType,
        uploadRequired: true,
        ensurePrimaryCompletion,
        availableQualities: primaryCompleteRequest.availableQualities,
        pendingQualities: primaryCompleteRequest.pendingQualities,
        failedQualities: [],
        degraded: primaryCompleteRequest.degraded,
        failedTargets: [],
      };
    }

    const completeResponse = await completeMediaUpload(prepared.sessionId, primaryCompleteRequest, options.signal);
    uploadDerivativeTargetsInBackground({
      availableQualities: [...availableQualities],
      completeSessionId: prepared.sessionId,
      entries: derivativeEntries,
      payload,
      retryPolicy,
    });

    return {
      fileId: prepared.fileId!,
      mediaType: payload.mediaType,
      uploadRequired: true,
      availableQualities: completeResponse.availableQualities ?? primaryCompleteRequest.availableQualities,
      pendingQualities: completeResponse.pendingQualities ?? primaryCompleteRequest.pendingQualities,
      failedQualities: completeResponse.failedQualities ?? primaryCompleteRequest.failedQualities,
      degraded: completeResponse.degraded ?? primaryCompleteRequest.degraded,
      failedTargets: [],
    };
  }

  const derivativeResults = await Promise.all(targetEntries
    .filter(([quality]) => quality !== primaryQuality)
    .map(async ([quality, target]) => uploadDerivativeTarget({
      file: payload.filesByQuality[quality as MediaQuality],
      quality,
      retryPolicy,
      signal: options.signal,
      target,
    })));

  for (const result of derivativeResults) {
    if (result.status === "succeeded") {
      availableQualities.push(result.quality);
      continue;
    }
    if (result.status === "skipped") {
      continue;
    }
    failedTargets.push(result.failedTarget);
    if (result.failedTarget.retryable || result.failedTarget.credentialExpired) {
      pendingQualities.push(result.quality);
    }
    else {
      failedQualities.push(result.quality);
    }
  }

  throwIfUploadAborted(options.signal);
  const completeRequest: MediaCompleteUploadRequest = {
    availableQualities,
    pendingQualities,
    failedQualities,
    degraded: pendingQualities.length > 0 || failedQualities.length > 0,
    failedTargets,
  };
  const completeResponse = await completeMediaUpload(prepared.sessionId, completeRequest, options.signal);

  return {
    fileId: prepared.fileId!,
    mediaType: payload.mediaType,
    uploadRequired: true,
    availableQualities: completeResponse.availableQualities ?? availableQualities,
    pendingQualities: completeResponse.pendingQualities ?? pendingQualities,
    failedQualities: completeResponse.failedQualities ?? failedQualities,
    degraded: completeResponse.degraded ?? completeRequest.degraded,
    failedTargets,
  };
}

function uploadDerivativeTargetsInBackground({
  availableQualities,
  completeSessionId,
  entries,
  payload,
  retryPolicy,
  ensurePrimaryCompletion,
}: {
  availableQualities: string[];
  completeSessionId: number;
  entries: Array<[string, MediaUploadTarget]>;
  payload: GeneratedMediaUploadFiles;
  retryPolicy: UploadTargetRetryPolicy;
  ensurePrimaryCompletion?: () => Promise<void>;
}) {
  if (entries.length === 0) {
    return;
  }

  void (async () => {
    const derivativeResults: Awaited<ReturnType<typeof uploadDerivativeTarget>>[] = [];
    for (const [quality, target] of sortDerivativeUploadEntries(entries)) {
      const result = await enqueueDerivativeUploadTask(async () => {
        try {
          return await uploadDerivativeTarget({
            file: await resolveDerivativeUploadFile(payload, quality as MediaQuality),
            quality,
            retryPolicy,
            target,
          });
        }
        catch (error) {
          const uploadError = normalizeUploadTargetError(error);
          return {
            status: "failed" as const,
            quality,
            failedTarget: {
              quality,
              error: uploadError.message,
              retryable: uploadError.retryable,
              credentialExpired: uploadError.credentialExpired || undefined,
            },
          };
        }
      });
      derivativeResults.push(result);
    }
    const nextAvailableQualities = [...availableQualities];
    const pendingQualities: string[] = [];
    const failedQualities: string[] = [];
    const failedTargets: FailedUploadTarget[] = [];

    for (const result of derivativeResults) {
      if (result.status === "succeeded") {
        nextAvailableQualities.push(result.quality);
        continue;
      }
      if (result.status === "skipped") {
        continue;
      }
      failedTargets.push(result.failedTarget);
      if (result.failedTarget.retryable || result.failedTarget.credentialExpired) {
        pendingQualities.push(result.quality);
      }
      else {
        failedQualities.push(result.quality);
      }
    }

    await ensurePrimaryCompletion?.();
    await completeMediaUpload(completeSessionId, {
      availableQualities: nextAvailableQualities,
      pendingQualities,
      failedQualities,
      degraded: pendingQualities.length > 0 || failedQualities.length > 0,
      failedTargets,
    });
  })().catch((error) => {
    console.warn("[媒体上传] 派生文件后台上传失败", error);
  });
}

function sortDerivativeUploadEntries(entries: Array<[string, MediaUploadTarget]>) {
  const qualityPriority = new Map<string, number>(
    DERIVATIVE_UPLOAD_QUALITY_ORDER.map((quality, index) => [quality, index]),
  );
  return entries.toSorted(([leftQuality], [rightQuality]) =>
    (qualityPriority.get(leftQuality) ?? Number.MAX_SAFE_INTEGER)
    - (qualityPriority.get(rightQuality) ?? Number.MAX_SAFE_INTEGER));
}

function enqueueDerivativeUploadTask<T>(task: () => Promise<T>): Promise<T> {
  const result = derivativeUploadQueue.then(async () => {
    await waitForLowPriorityUploadTurn();
    return await task();
  });
  derivativeUploadQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function waitForLowPriorityUploadTurn(): Promise<void> {
  if (typeof globalThis.requestIdleCallback !== "function") {
    await new Promise<void>(resolve => setTimeout(resolve, DERIVATIVE_UPLOAD_IDLE_DELAY_MS));
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    let idleCallbackId: number | undefined;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(maxWaitTimer);
      if (idleCallbackId !== undefined && typeof globalThis.cancelIdleCallback === "function") {
        globalThis.cancelIdleCallback(idleCallbackId);
      }
      resolve();
    };
    const maxWaitTimer = setTimeout(finish, DERIVATIVE_UPLOAD_MAX_WAIT_MS);
    idleCallbackId = globalThis.requestIdleCallback(finish, {
      timeout: DERIVATIVE_UPLOAD_MAX_WAIT_MS,
    });
  });
}

async function resolveDerivativeUploadFile(
  payload: GeneratedMediaUploadFiles,
  quality: MediaQuality,
): Promise<File | undefined> {
  const file = payload.filesByQuality[quality];
  if (file) {
    return file;
  }
  return await payload.deferredFilesByQuality?.[quality]?.();
}

async function uploadDerivativeTarget({
  file,
  quality,
  retryPolicy,
  signal,
  target,
}: {
  file?: File;
  quality: string;
  retryPolicy: UploadTargetRetryPolicy;
  signal?: AbortSignal;
  target: MediaUploadTarget;
}): Promise<
  | { status: "succeeded"; quality: string }
  | { status: "skipped"; quality: string }
  | { status: "failed"; quality: string; failedTarget: FailedUploadTarget }
> {
  if (!file) {
    return {
      status: "failed",
      quality,
      failedTarget: {
        quality,
        error: `缺少 ${quality} 上传文件`,
        retryable: false,
      },
    };
  }

  try {
    await putMediaTargetWithRetry(target, file, quality, signal, retryPolicy);
    return { status: "succeeded", quality };
  }
  catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const uploadError = normalizeUploadTargetError(error);
    return {
      status: "failed",
      quality,
      failedTarget: {
        quality,
        error: uploadError.message,
        retryable: uploadError.retryable,
        credentialExpired: uploadError.credentialExpired || undefined,
      },
    };
  }
}

async function putMediaTargetWithRetry(
  target: MediaUploadTarget,
  file: File,
  quality: string,
  signal: AbortSignal | undefined,
  retryPolicy: UploadTargetRetryPolicy,
) {
  let lastError: MediaTargetUploadError | null = null;
  for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
    try {
      await putMediaTarget(target, file, signal);
      return;
    }
    catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      const uploadError = normalizeUploadTargetError(error);
      lastError = uploadError;
      const canRetryUploadTarget = uploadError.retryable
        && !uploadError.credentialExpired
        && attempt < retryPolicy.maxAttempts;
      if (!canRetryUploadTarget) {
        throw uploadError;
      }
      await sleepUploadRetryDelay(resolveRetryDelayMs(attempt, retryPolicy), signal);
    }
  }
  throw lastError ?? new MediaTargetUploadError(`${quality} 上传失败`, { retryable: false });
}

async function putMediaTarget(target: MediaUploadTarget, file: File, signal?: AbortSignal) {
  throwIfUploadAborted(signal);
  if (!target.uploadUrl) {
    throw new Error("上传目标缺少 uploadUrl");
  }
  const { targetUrl, headers } = resolveOssUploadTarget(target.uploadUrl, file, target.uploadHeaders);
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "PUT",
      body: file,
      headers,
      signal,
    });
  }
  catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new MediaTargetUploadError("媒体文件上传失败: 网络错误", { retryable: true });
  }
  throwIfUploadAborted(signal);
  if (!response.ok) {
    const credentialExpired = response.status === 401 || response.status === 403;
    throw new MediaTargetUploadError(`媒体文件上传失败: ${response.status}`, {
      credentialExpired,
      retryable: !credentialExpired && isRetryableUploadStatus(response.status),
      status: response.status,
    });
  }
}

function resolvePrimaryUploadQuality(
  payload: GeneratedMediaUploadFiles,
  targetEntries: Array<[string, MediaUploadTarget]>,
): string {
  if (targetEntries.some(([quality]) => quality === "original")) {
    return "original";
  }
  const firstWithFile = targetEntries.find(([quality]) => Boolean(payload.filesByQuality[quality as MediaQuality]));
  return firstWithFile?.[0] ?? targetEntries[0]?.[0] ?? "original";
}

function isRetryableUploadStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function normalizeUploadTargetError(error: unknown): MediaTargetUploadError {
  if (error instanceof MediaTargetUploadError) {
    return error;
  }
  if (error instanceof Error) {
    return new MediaTargetUploadError(error.message || "媒体文件上传失败", { retryable: false });
  }
  return new MediaTargetUploadError(String(error || "媒体文件上传失败"), { retryable: false });
}

function normalizeRetryPolicy(policy?: Partial<UploadTargetRetryPolicy>): UploadTargetRetryPolicy {
  const maxAttempts = Math.max(1, Math.floor(policy?.maxAttempts ?? DEFAULT_UPLOAD_TARGET_RETRY_POLICY.maxAttempts));
  return {
    maxAttempts,
    baseDelayMs: Math.max(0, policy?.baseDelayMs ?? DEFAULT_UPLOAD_TARGET_RETRY_POLICY.baseDelayMs),
    maxDelayMs: Math.max(0, policy?.maxDelayMs ?? DEFAULT_UPLOAD_TARGET_RETRY_POLICY.maxDelayMs),
    jitter: policy?.jitter ?? DEFAULT_UPLOAD_TARGET_RETRY_POLICY.jitter,
  };
}

function resolveRetryDelayMs(failedAttempt: number, policy: UploadTargetRetryPolicy): number {
  const exponentialDelay = policy.baseDelayMs * 2 ** Math.max(0, failedAttempt - 1);
  const cappedDelay = Math.min(policy.maxDelayMs, exponentialDelay);
  if (!policy.jitter || cappedDelay <= 0) {
    return cappedDelay;
  }
  return Math.floor(cappedDelay * (0.75 + Math.random() * 0.5));
}

async function sleepUploadRetryDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfUploadAborted(signal);
  if (delayMs <= 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(createUploadAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

async function prepareMediaUpload(payload: GeneratedMediaUploadFiles, options: UploadMediaFileOptions = {}) {
  throwIfUploadAborted(options.signal);
  const result = await tuanchat.mediaController.prepareUpload({
    fileName: payload.original.name,
    scene: options.scene,
    sha256: await calculateFileSha256(payload.original),
    sizeBytes: payload.original.size,
    mimeType: normalizeMimeType(payload.original.type) || "application/octet-stream",
    contentType: normalizeMimeType(payload.original.type) || "application/octet-stream",
    hasNovelAiMetadata: payload.hasNovelAiMetadata,
    metadata: payload.metadata,
  });
  throwIfUploadAborted(options.signal);
  if (!result.success || !result.data?.fileId || !result.data.mediaType) {
    throw new Error(result.errMsg || "准备媒体上传失败");
  }
  return result.data;
}

async function completeMediaUpload(sessionId: number, request: MediaCompleteUploadRequest, signal?: AbortSignal) {
  throwIfUploadAborted(signal);
  const result = await tuanchat.mediaController.completeUpload(sessionId, request);
  throwIfUploadAborted(signal);
  if (!result.success) {
    throw new Error(result.errMsg || "完成媒体上传失败");
  }
  return result.data ?? {};
}

export async function uploadMediaFile(file: File, options: UploadMediaFileOptions = {}): Promise<UploadedMediaFile> {
  throwIfUploadAborted(options.signal);
  const payload = options.completeAfterPrimaryQuality && inferMediaType(file) === "image"
    ? await generateOriginalFirstImageUploadFiles(file, options.scene)
    : await generateMediaUploadFiles(file, options.scene);
  throwIfUploadAborted(options.signal);
  return await uploadGeneratedMediaFiles(payload, options);
}
