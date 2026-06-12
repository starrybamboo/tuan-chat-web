import { extractMediaFileIdFromUrl, imageOriginalUrlFromUrl } from "@/utils/mediaUrl";

type MediaImageDerivativeStatus = "available" | "missing";

type MediaImageDerivativeRecord = {
  fileId: number;
  status: MediaImageDerivativeStatus;
  updatedAt: number;
};

type MediaImageDerivativeStorage = {
  version: 1;
  records: MediaImageDerivativeRecord[];
};

const MEDIA_IMAGE_DERIVATIVE_STATUS_STORAGE_KEY = "tuanchat-media-image-derived-status-v1";
const MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS = new Map<number, MediaImageDerivativeRecord>();
const MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES = new Map<number, HTMLImageElement>();

let mediaImageDerivativeStatusLoaded = false;

function normalizeMediaImageUrl(rawUrl: string | null | undefined): string {
  const value = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!value) {
    return "";
  }
  if (/^(?:blob|data|file|asset):/i.test(value)) {
    return value;
  }
  try {
    return new URL(value, getBaseUrl()).toString();
  }
  catch {
    return value;
  }
}

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }
  return "http://localhost/";
}

function getBrowserStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
      return null;
    }
    return globalThis.localStorage;
  }
  catch {
    return null;
  }
}

function isPersistentMediaImageDebugEnabled(): boolean {
  try {
    const runtimeFlag = (globalThis as { __TC_MEDIA_IMAGE_DEBUG__?: boolean }).__TC_MEDIA_IMAGE_DEBUG__;
    const storageFlag = getBrowserStorage()?.getItem("tuanchat:debug-media-image");
    return runtimeFlag === true || storageFlag === "1" || storageFlag === "true";
  }
  catch {
    return false;
  }
}

export function logPersistentMediaImageDebug(event: string, payload?: Record<string, unknown>): void {
  if (!isPersistentMediaImageDebugEnabled()) {
    return;
  }
  console.warn("[MediaImageDebug]", event, payload ?? {});
}

function ensureMediaImageDerivativeStatusLoaded(): void {
  if (mediaImageDerivativeStatusLoaded) {
    return;
  }
  mediaImageDerivativeStatusLoaded = true;

  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  try {
    const parsed = JSON.parse(storage.getItem(MEDIA_IMAGE_DERIVATIVE_STATUS_STORAGE_KEY) || "null") as Partial<MediaImageDerivativeStorage> | null;
    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    for (const record of records) {
      if (!record || typeof record.fileId !== "number") {
        continue;
      }
      if (record.status !== "available" && record.status !== "missing") {
        continue;
      }
      MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.set(record.fileId, {
        fileId: record.fileId,
        status: record.status,
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
      });
    }
    logPersistentMediaImageDebug("cache.load", { count: MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.size });
  }
  catch {
    // 损坏的本地缓存不影响图片加载，后续成功/失败事件会重建它。
    logPersistentMediaImageDebug("cache.load_failed");
  }
}

function persistMediaImageDerivativeStatus(): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const records = Array.from(MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.values())
    .sort((left, right) => right.updatedAt - left.updatedAt);

  try {
    storage.setItem(MEDIA_IMAGE_DERIVATIVE_STATUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      records,
    } satisfies MediaImageDerivativeStorage));
  }
  catch {
    // localStorage 可能被禁用或空间不足；内存缓存仍然可用。
  }
}

function readMediaImageDerivativeRecord(fileId: number): MediaImageDerivativeRecord | null {
  ensureMediaImageDerivativeStatusLoaded();
  return MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.get(fileId) ?? null;
}

function writeMediaImageDerivativeRecord(fileId: number, status: MediaImageDerivativeStatus): void {
  ensureMediaImageDerivativeStatusLoaded();
  MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.set(fileId, {
    fileId,
    status,
    updatedAt: Date.now(),
  });
  logPersistentMediaImageDebug("cache.write", { fileId, status });
  persistMediaImageDerivativeStatus();
}

function resolveMediaImageDerivativeInfo(src: string | null | undefined): {
  fileId: number;
  normalizedSrc: string;
  originalSrc: string;
} | null {
  const normalizedSrc = normalizeMediaImageUrl(src);
  if (!normalizedSrc) {
    return null;
  }

  const fileId = extractMediaFileIdFromUrl(normalizedSrc);
  const originalSrc = resolveMediaImageOriginalFallbackSrc(normalizedSrc);
  if (fileId == null || !originalSrc) {
    return null;
  }

  return {
    fileId,
    normalizedSrc,
    originalSrc,
  };
}

export function resolveMediaImageOriginalFallbackSrc(src: string | null | undefined): string | undefined {
  const normalized = normalizeMediaImageUrl(src);
  if (!normalized) {
    return undefined;
  }
  const originalSrc = normalizeMediaImageUrl(imageOriginalUrlFromUrl(normalized));
  return originalSrc !== normalized ? originalSrc : undefined;
}

export function resolvePersistentMediaImageSrcSync(src: string | null | undefined): string | null {
  const normalized = normalizeMediaImageUrl(src);
  if (!normalized) {
    return null;
  }

  const derivativeInfo = resolveMediaImageDerivativeInfo(normalized);
  if (!derivativeInfo) {
    logPersistentMediaImageDebug("resolve.non_derivative", { src: normalized });
    return normalized;
  }

  const record = readMediaImageDerivativeRecord(derivativeInfo.fileId);
  const resolvedSrc = record?.status === "missing" ? derivativeInfo.originalSrc : derivativeInfo.normalizedSrc;
  logPersistentMediaImageDebug("resolve.display_src", {
    fileId: derivativeInfo.fileId,
    requestedDerivativeSrc: derivativeInfo.normalizedSrc,
    resolvedDisplaySrc: resolvedSrc,
    derivativeStatus: record?.status ?? "unknown",
  });
  return resolvedSrc;
}

export async function resolvePersistentMediaImageSrc(src: string | null | undefined): Promise<string | null> {
  return resolvePersistentMediaImageSrcSync(src);
}

export function startPersistentMediaImageDerivativeProbe(src: string | null | undefined): void {
  const derivativeInfo = resolveMediaImageDerivativeInfo(src);
  if (!derivativeInfo) {
    logPersistentMediaImageDebug("probe.skip_non_derivative", { src });
    return;
  }

  const record = readMediaImageDerivativeRecord(derivativeInfo.fileId);
  if (record) {
    logPersistentMediaImageDebug("probe.skip_cached", {
      fileId: derivativeInfo.fileId,
      status: record.status,
    });
    return;
  }

  if (MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES.has(derivativeInfo.fileId)) {
    logPersistentMediaImageDebug("probe.skip_inflight", { fileId: derivativeInfo.fileId });
    return;
  }

  if (typeof Image === "undefined") {
    logPersistentMediaImageDebug("probe.skip_no_image", { fileId: derivativeInfo.fileId });
    return;
  }

  const image = new Image();
  const cleanup = () => {
    image.onload = null;
    image.onerror = null;
    MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES.delete(derivativeInfo.fileId);
  };

  image.onload = () => {
    logPersistentMediaImageDebug("probe.load", {
      fileId: derivativeInfo.fileId,
      src: derivativeInfo.normalizedSrc,
    });
    cleanup();
  };
  image.onerror = () => {
    logPersistentMediaImageDebug("probe.error", {
      fileId: derivativeInfo.fileId,
      src: derivativeInfo.normalizedSrc,
    });
    writeMediaImageDerivativeRecord(derivativeInfo.fileId, "missing");
    cleanup();
  };

  MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES.set(derivativeInfo.fileId, image);
  logPersistentMediaImageDebug("probe.start", {
    fileId: derivativeInfo.fileId,
    src: derivativeInfo.normalizedSrc,
  });
  image.src = derivativeInfo.normalizedSrc;
}

function rememberPersistentMediaImageDerivativeStatus(src: string | null | undefined, status: MediaImageDerivativeStatus): void {
  const derivativeInfo = resolveMediaImageDerivativeInfo(src);
  if (!derivativeInfo) {
    return;
  }
  writeMediaImageDerivativeRecord(derivativeInfo.fileId, status);
}

export function rememberPersistentMediaImageDerivedAvailable(src: string | null | undefined): void {
  rememberPersistentMediaImageDerivativeStatus(src, "available");
}

export function rememberPersistentMediaImageDerivedMissing(src: string | null | undefined): void {
  rememberPersistentMediaImageDerivativeStatus(src, "missing");
}

export function resetPersistentMediaImageCacheForTests(): void {
  MEDIA_IMAGE_DERIVATIVE_STATUS_RECORDS.clear();
  for (const image of MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES.values()) {
    image.onload = null;
    image.onerror = null;
  }
  MEDIA_IMAGE_DERIVATIVE_STATUS_PROBES.clear();
  mediaImageDerivativeStatusLoaded = false;

  try {
    getBrowserStorage()?.removeItem(MEDIA_IMAGE_DERIVATIVE_STATUS_STORAGE_KEY);
  }
  catch {
    // ignore
  }
}
