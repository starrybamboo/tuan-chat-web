import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { extractMediaFileIdFromUrl } from "@tuanchat/domain/media-url";

const CACHE_DIR_NAME = "mobile-image-cache";
const WEB_CACHE_NAME = "tuanchat-mobile-image-cache-v1";
const FAILURE_BACKOFF_MS = 30_000;

const webPrefetchedKeys = new Set<string>();
const failedKeys = new Map<string, number>();
const nativeInflightRequests = new Map<string, Promise<string | null>>();
const webInflightRequests = new Map<string, Promise<string | null>>();
const webObjectUrls = new Map<string, string>();

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
  return new Directory(Paths.cache, CACHE_DIR_NAME);
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

  const file = getCacheFile(url);
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

async function downloadImageToDisk(url: string): Promise<string | null> {
  const key = normalizeCacheKey(url);
  if (isBackedOff(url))
    return null;

  const cachedUri = getCachedImageUriSync(url);
  if (cachedUri)
    return cachedUri;

  const inflight = nativeInflightRequests.get(key);
  if (inflight)
    return inflight;

  const targetFile = getCacheFile(url);
  const request = (async () => {
    try {
      ensureCacheDirectory();
      const downloaded = await File.downloadFileAsync(url, targetFile, { idempotent: true });
      failedKeys.delete(key);
      return downloaded.uri;
    }
    catch {
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
      return null;
    }
    finally {
      nativeInflightRequests.delete(key);
    }
  })();

  nativeInflightRequests.set(key, request);
  return request;
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

  return await downloadImageToDisk(url);
}

export async function prefetchImage(url: string): Promise<boolean> {
  if (!url || isLocalImageUri(url) || !isRemoteUrl(url))
    return true;
  if (!shouldUseNativeDiskCache()) {
    return (await resolveWebCachedImageUri(url)) != null;
  }
  return (await downloadImageToDisk(url)) != null;
}

export async function prefetchImages(urls: readonly string[]): Promise<void> {
  const pending = urls.filter(url => !isAlreadyCached(url) && !isBackedOff(url));
  if (pending.length === 0)
    return;
  await Promise.all(pending.map(prefetchImage));
}

export function resetCache(): void {
  webPrefetchedKeys.clear();
  failedKeys.clear();
  nativeInflightRequests.clear();
  webInflightRequests.clear();
  for (const objectUrl of webObjectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  webObjectUrls.clear();
}
