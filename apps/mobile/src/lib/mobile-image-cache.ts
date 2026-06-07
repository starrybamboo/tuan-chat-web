import { extractMediaFileIdFromUrl, imageOriginalUrlFromUrl } from "@tuanchat/domain/media-url";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const CACHE_DIR_NAME = "mobile-image-cache";
const DERIVATIVE_STATUS_FILE_NAME = "derived-status-v1.json";
const WEB_CACHE_NAME = "tuanchat-mobile-image-cache-v1";
const FAILURE_BACKOFF_MS = 30_000;
const DEFAULT_PREFETCH_CONCURRENCY = 4;

export type PrefetchImagesOptions = {
  concurrency?: number;
};

type MediaImageDerivativeStatus = "available" | "missing";

type MediaImageDerivativeRecord = {
  fileId: number;
  status: MediaImageDerivativeStatus;
  updatedAt: number;
};

type MediaImageDerivativeStorage = {
  records: MediaImageDerivativeRecord[];
  version: 1;
};

type NativeImageDownloadResult = {
  permanentMissing: boolean;
  uri: string | null;
};

const webPrefetchedKeys = new Set<string>();
const failedKeys = new Map<string, number>();
const nativeInflightRequests = new Map<string, Promise<NativeImageDownloadResult>>();
const webInflightRequests = new Map<string, Promise<string | null>>();
const webObjectUrls = new Map<string, string>();
const nativeDerivativeStatusRecords = new Map<number, MediaImageDerivativeRecord>();

let nativeDerivativeStatusLoaded = false;

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function isLocalImageUri(url: string): boolean {
  return url.startsWith("file://") || url.startsWith("asset") || url.startsWith("data:");
}

function shouldUseNativeDiskCache(): boolean {
  return Platform.OS !== "web";
}

function getQualityFromUrl(url: string): string {
  const qualityMatch = url.match(/\/(low|medium|high)(?:[.?#]|$)/);
  if (qualityMatch?.[1]) {
    return qualityMatch[1];
  }
  if (/\/original(?:[?#]|$)/.test(url)) {
    return "original";
  }
  return "low";
}

function getCacheFileExtension(url: string): string {
  const extensionMatch = url.match(/\/(?:low|medium|high)\.([a-z0-9]+)(?:[?#]|$)/i);
  if (extensionMatch?.[1]) {
    return `.${extensionMatch[1].toLowerCase()}`;
  }
  return ".img";
}

function getCacheFileName(url: string): string {
  return `${getCacheKey(url)}${getCacheFileExtension(url)}`;
}

function getCacheDirectory(): Directory {
  return new Directory(Paths.document, CACHE_DIR_NAME);
}

function ensureCacheDirectory(): Directory {
  const directory = getCacheDirectory();
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function getCacheFile(url: string): File {
  return new File(getCacheDirectory(), getCacheFileName(url));
}

function getDerivativeStatusFile(): File {
  return new File(getCacheDirectory(), DERIVATIVE_STATUS_FILE_NAME);
}

export function getCacheKey(url: string): string {
  const fileId = extractMediaFileIdFromUrl(url);
  if (fileId != null) {
    return `${fileId}_${getQualityFromUrl(url)}`;
  }
  return url;
}

function normalizeCacheKey(url: string): string {
  return getCacheKey(url);
}

function resolveImageDerivativeInfo(url: string | null | undefined): {
  fileId: number;
  normalizedUrl: string;
  originalFallbackUri: string;
} | null {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  if (!normalizedUrl) {
    return null;
  }

  const fileId = extractMediaFileIdFromUrl(normalizedUrl);
  const originalFallbackUri = imageOriginalUrlFromUrl(normalizedUrl);
  if (fileId == null || originalFallbackUri === normalizedUrl) {
    return null;
  }

  return {
    fileId,
    normalizedUrl,
    originalFallbackUri,
  };
}

function ensureNativeDerivativeStatusLoaded(): void {
  if (nativeDerivativeStatusLoaded) {
    return;
  }
  nativeDerivativeStatusLoaded = true;

  if (!shouldUseNativeDiskCache()) {
    return;
  }

  try {
    const file = getDerivativeStatusFile();
    if (!file.exists) {
      return;
    }

    const parsed = JSON.parse(file.textSync()) as Partial<MediaImageDerivativeStorage> | null;
    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    for (const record of records) {
      if (!record || typeof record.fileId !== "number") {
        continue;
      }
      if (record.status !== "available" && record.status !== "missing") {
        continue;
      }
      nativeDerivativeStatusRecords.set(record.fileId, {
        fileId: record.fileId,
        status: record.status,
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
      });
    }
  }
  catch {
    nativeDerivativeStatusRecords.clear();
  }
}

function persistNativeDerivativeStatus(): void {
  if (!shouldUseNativeDiskCache()) {
    return;
  }

  try {
    ensureCacheDirectory();
    getDerivativeStatusFile().write(JSON.stringify({
      records: Array.from(nativeDerivativeStatusRecords.values())
        .sort((left, right) => right.updatedAt - left.updatedAt),
      version: 1,
    } satisfies MediaImageDerivativeStorage));
  }
  catch {
    // 派生图状态只是优化；写入失败时仍保留内存状态和图片 fallback。
  }
}

function readNativeDerivativeStatus(url: string): MediaImageDerivativeStatus | null {
  const derivativeInfo = resolveImageDerivativeInfo(url);
  if (!derivativeInfo) {
    return null;
  }

  ensureNativeDerivativeStatusLoaded();
  return nativeDerivativeStatusRecords.get(derivativeInfo.fileId)?.status ?? null;
}

function rememberNativeDerivativeStatus(url: string, status: MediaImageDerivativeStatus): void {
  const derivativeInfo = resolveImageDerivativeInfo(url);
  if (!derivativeInfo) {
    return;
  }

  ensureNativeDerivativeStatusLoaded();
  nativeDerivativeStatusRecords.set(derivativeInfo.fileId, {
    fileId: derivativeInfo.fileId,
    status,
    updatedAt: Date.now(),
  });
  persistNativeDerivativeStatus();
}

function resolveOriginalFallbackUrl(url: string): string | null {
  return resolveImageDerivativeInfo(url)?.originalFallbackUri ?? null;
}

function resolveNativeDisplayUrl(url: string): string {
  const originalUrl = resolveOriginalFallbackUrl(url);
  if (!originalUrl || readNativeDerivativeStatus(url) !== "missing") {
    return url;
  }
  return originalUrl;
}

function getWebCacheRequest(url: string): Request {
  const key = encodeURIComponent(normalizeCacheKey(url));
  return new Request(`/__tuanchat_mobile_image_cache__/${key}`);
}

function getWebCacheStorage(): CacheStorage | null {
  return typeof caches === "undefined" ? null : caches;
}

async function resolveWebCachedImageUri(url: string): Promise<string | null> {
  const key = normalizeCacheKey(url);
  const objectUrl = webObjectUrls.get(key);
  if (objectUrl)
    return objectUrl;
  if (isBackedOff(url))
    return null;

  const inflight = webInflightRequests.get(key);
  if (inflight)
    return inflight;

  const request = (async () => {
    const cacheStorage = getWebCacheStorage();
    if (!cacheStorage) {
      return url;
    }

    try {
      const cache = await cacheStorage.open(WEB_CACHE_NAME);
      const cacheRequest = getWebCacheRequest(url);
      let response = await cache.match(cacheRequest);

      if (!response) {
        const fetched = await fetch(url, { cache: "force-cache", mode: "cors" });
        if (!fetched.ok) {
          failedKeys.set(key, Date.now());
          return url;
        }
        await cache.put(cacheRequest, fetched.clone());
        response = fetched;
      }

      const blob = await response.blob();
      const cachedObjectUrl = URL.createObjectURL(blob);
      webObjectUrls.set(key, cachedObjectUrl);
      webPrefetchedKeys.add(key);
      failedKeys.delete(key);
      return cachedObjectUrl;
    }
    catch {
      failedKeys.set(key, Date.now());
      return url;
    }
    finally {
      webInflightRequests.delete(key);
    }
  })();

  webInflightRequests.set(key, request);
  return request;
}

export function getCachedImageUriSync(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (isLocalImageUri(url) || !isRemoteUrl(url)) {
    return url;
  }
  if (!shouldUseNativeDiskCache()) {
    return webObjectUrls.get(normalizeCacheKey(url)) ?? null;
  }

  const file = getCacheFile(resolveNativeDisplayUrl(url));
  return file.exists ? file.uri : null;
}

export function isAlreadyCached(url: string): boolean {
  if (!shouldUseNativeDiskCache()) {
    return webPrefetchedKeys.has(normalizeCacheKey(url));
  }
  return getCachedImageUriSync(url) != null;
}

function isBackedOff(url: string): boolean {
  const key = normalizeCacheKey(url);
  const failedAt = failedKeys.get(key);
  if (failedAt == null)
    return false;
  if (Date.now() - failedAt > FAILURE_BACKOFF_MS) {
    failedKeys.delete(key);
    return false;
  }
  return true;
}

function extractNativeDownloadHttpStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const status = (error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode;
    if (typeof status === "number" && Number.isInteger(status)) {
      return status;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\bstatus:?\s+(\d{3})\b/i);
  if (!statusMatch?.[1]) {
    return null;
  }
  const status = Number(statusMatch[1]);
  return Number.isInteger(status) ? status : null;
}

function resolveNativeDownloadFailure(error: unknown): NativeImageDownloadResult {
  const status = extractNativeDownloadHttpStatus(error);
  return {
    permanentMissing: status === 404 || status === 410,
    uri: null,
  };
}

async function downloadImageToDisk(url: string): Promise<NativeImageDownloadResult> {
  const key = normalizeCacheKey(url);
  if (isBackedOff(url))
    return { permanentMissing: false, uri: null };

  const cachedUri = getCachedImageUriSync(url);
  if (cachedUri)
    return { permanentMissing: false, uri: cachedUri };

  const inflight = nativeInflightRequests.get(key);
  if (inflight)
    return inflight;

  const targetFile = getCacheFile(url);
  const request = (async () => {
    try {
      ensureCacheDirectory();
      const downloaded = await File.downloadFileAsync(url, targetFile, { idempotent: true });
      failedKeys.delete(key);
      return { permanentMissing: false, uri: downloaded.uri };
    }
    catch (error) {
      failedKeys.set(key, Date.now());
      // Android can leave a partial file if a download fails mid-stream.
      try {
        if (targetFile.exists) {
          targetFile.delete();
        }
      }
      catch {
        // Best effort cleanup only.
      }
      return resolveNativeDownloadFailure(error);
    }
    finally {
      nativeInflightRequests.delete(key);
    }
  })();

  nativeInflightRequests.set(key, request);
  return request;
}

async function resolveNativeCachedImageUri(url: string): Promise<string | null> {
  const displayUrl = resolveNativeDisplayUrl(url);
  const preferredDownload = await downloadImageToDisk(displayUrl);
  if (preferredDownload.uri) {
    return preferredDownload.uri;
  }

  const originalUrl = displayUrl === url ? resolveOriginalFallbackUrl(url) : null;
  if (!originalUrl) {
    return null;
  }

  const originalDownload = await downloadImageToDisk(originalUrl);
  if (!originalDownload.uri) {
    return null;
  }

  if (preferredDownload.permanentMissing) {
    rememberNativeDerivativeStatus(url, "missing");
  }
  return originalDownload.uri;
}

export async function resolveCachedImageUri(url: string | null | undefined): Promise<string | null> {
  const cachedUri = getCachedImageUriSync(url);
  if (cachedUri || !url) {
    return cachedUri;
  }
  if (isLocalImageUri(url) || !isRemoteUrl(url)) {
    return url;
  }
  if (!shouldUseNativeDiskCache()) {
    return await resolveWebCachedImageUri(url);
  }

  return await resolveNativeCachedImageUri(url);
}

export async function prefetchImage(url: string): Promise<boolean> {
  if (!url || isLocalImageUri(url) || !isRemoteUrl(url))
    return true;
  if (!shouldUseNativeDiskCache()) {
    return (await resolveWebCachedImageUri(url)) != null;
  }
  return (await resolveNativeCachedImageUri(url)) != null;
}

function normalizeConcurrency(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_PREFETCH_CONCURRENCY;
}

export async function prefetchImages(urls: readonly string[], options: PrefetchImagesOptions = {}): Promise<void> {
  const seenKeys = new Set<string>();
  const pending = urls.filter((url) => {
    const key = normalizeCacheKey(url);
    if (seenKeys.has(key) || isAlreadyCached(url) || isBackedOff(url)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
  if (pending.length === 0)
    return;
  const concurrency = normalizeConcurrency(options.concurrency);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < pending.length) {
      const url = pending[nextIndex++];
      await prefetchImage(url);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()),
  );
}

export function resetCache(options: { clearPersistent?: boolean } = {}): void {
  webPrefetchedKeys.clear();
  failedKeys.clear();
  nativeInflightRequests.clear();
  webInflightRequests.clear();
  nativeDerivativeStatusRecords.clear();
  nativeDerivativeStatusLoaded = false;
  for (const objectUrl of webObjectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  webObjectUrls.clear();

  if (options.clearPersistent === false || !shouldUseNativeDiskCache()) {
    return;
  }

  try {
    const statusFile = getDerivativeStatusFile();
    if (statusFile.exists) {
      statusFile.delete();
    }
  }
  catch {
    // ignore test/runtime cleanup failures
  }
}
