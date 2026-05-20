import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { extractMediaFileIdFromUrl } from "@tuanchat/domain/media-url";

const CACHE_DIR_NAME = "mobile-media-file-cache";
const FAILURE_BACKOFF_MS = 30_000;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60_000;
const DEFAULT_MAX_FILE_SIZE_BYTES = 256 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_SIZE_BYTES = 512 * 1024 * 1024;

export type MobileMediaFileCacheOptions = {
  fallbackToRemote?: boolean;
  fileName?: string | null;
  maxFileSizeBytes?: number;
  maxTotalSizeBytes?: number;
  now?: number;
  ttlMs?: number;
};

export type MobileMediaFileCacheCleanupResult = {
  deletedCount: number;
  remainingSizeBytes: number;
};

type CacheFile = Pick<File, "contentUri" | "delete" | "exists" | "modificationTime" | "size" | "uri">;

const failedKeys = new Map<string, number>();
const inflightRequests = new Map<string, Promise<string | null>>();

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function isLocalMediaUri(url: string): boolean {
  return /^(?:file|content|asset|data|blob):/i.test(url.trim());
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
  return "file";
}

function getMediaTypeFromUrl(url: string): string {
  const mediaTypeMatch = url.match(/\/(audio|video|image)\/(?:low|medium|high)\./);
  return mediaTypeMatch?.[1] ?? "file";
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function getExtensionFromFileName(fileName: string | null | undefined): string | null {
  const extensionMatch = fileName?.trim().match(/\.([a-z0-9]{1,8})$/i);
  return extensionMatch?.[1] ? `.${extensionMatch[1].toLowerCase()}` : null;
}

function getCacheFileExtension(url: string, options: MobileMediaFileCacheOptions = {}): string {
  const extensionMatch = url.match(/\/(?:low|medium|high)\.([a-z0-9]+)(?:[?#]|$)/i);
  if (extensionMatch?.[1]) {
    return `.${extensionMatch[1].toLowerCase()}`;
  }
  const fileNameExtension = getExtensionFromFileName(options.fileName);
  if (fileNameExtension) {
    return fileNameExtension;
  }
  const pathExtensionMatch = url.match(/\/[^/?#]+\.([a-z0-9]{1,8})(?:[?#]|$)/i);
  if (pathExtensionMatch?.[1]) {
    return `.${pathExtensionMatch[1].toLowerCase()}`;
  }
  return ".bin";
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

function getFallbackUri(url: string, options: MobileMediaFileCacheOptions): string | null {
  return options.fallbackToRemote === false ? null : url;
}

function getOpenableFileUri(file: CacheFile): string {
  if (Platform.OS === "android" && file.contentUri) {
    return file.contentUri;
  }
  return file.uri;
}

function getCacheFileName(url: string, options: MobileMediaFileCacheOptions = {}): string {
  return `${getMediaFileCacheKey(url)}${getCacheFileExtension(url, options)}`;
}

function getCacheFile(url: string, options: MobileMediaFileCacheOptions = {}): File {
  return new File(getCacheDirectory(), getCacheFileName(url, options));
}

function isBackedOff(url: string, now = Date.now()): boolean {
  const key = getMediaFileCacheKey(url);
  const failedAt = failedKeys.get(key);
  if (failedAt == null)
    return false;
  if (now - failedAt > FAILURE_BACKOFF_MS) {
    failedKeys.delete(key);
    return false;
  }
  return true;
}

function isUsableCachedFile(file: CacheFile, options: MobileMediaFileCacheOptions = {}): boolean {
  if (!file.exists) {
    return false;
  }
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const modificationTime = file.modificationTime ?? 0;
  if (file.size > maxFileSizeBytes) {
    return false;
  }
  if (ttlMs > 0 && modificationTime > 0 && now - modificationTime > ttlMs) {
    return false;
  }
  return true;
}

function deleteFileBestEffort(file: CacheFile): boolean {
  try {
    if (file.exists) {
      file.delete();
      return true;
    }
  }
  catch {
    // Best effort cleanup only.
  }
  return false;
}

export function getMediaFileCacheKey(url: string): string {
  const fileId = extractMediaFileIdFromUrl(url);
  if (fileId != null) {
    return `${fileId}_${getMediaTypeFromUrl(url)}_${getQualityFromUrl(url)}`;
  }
  return `url_${hashString(url)}`;
}

export function getCachedMediaFileUriSync(
  url: string | null | undefined,
  options: MobileMediaFileCacheOptions = {},
): string | null {
  const value = url?.trim();
  if (!value) {
    return null;
  }
  if (isLocalMediaUri(value) || !isRemoteUrl(value)) {
    return value;
  }
  if (!shouldUseNativeDiskCache()) {
    return value;
  }

  const file = getCacheFile(value, options);
  if (!isUsableCachedFile(file, options)) {
    deleteFileBestEffort(file);
    return null;
  }
  return getOpenableFileUri(file);
}

export async function resolveCachedMediaFileUri(
  url: string | null | undefined,
  options: MobileMediaFileCacheOptions = {},
): Promise<string | null> {
  const value = url?.trim();
  if (!value) {
    return null;
  }

  const cachedUri = getCachedMediaFileUriSync(value, options);
  if (cachedUri) {
    return cachedUri;
  }
  if (isLocalMediaUri(value) || !isRemoteUrl(value) || !shouldUseNativeDiskCache()) {
    return value;
  }
  if (isBackedOff(value, options.now)) {
    return getFallbackUri(value, options);
  }

  const key = getMediaFileCacheKey(value);
  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight;
  }

  const targetFile = getCacheFile(value, options);
  const request = (async () => {
    try {
      ensureCacheDirectory();
      const downloaded = await File.downloadFileAsync(value, targetFile, { idempotent: true });
      if (!isUsableCachedFile(downloaded, options)) {
        deleteFileBestEffort(downloaded);
        failedKeys.set(key, options.now ?? Date.now());
        return getFallbackUri(value, options);
      }
      failedKeys.delete(key);
      await cleanupMobileMediaFileCache(options);
      return getOpenableFileUri(downloaded);
    }
    catch {
      failedKeys.set(key, options.now ?? Date.now());
      deleteFileBestEffort(targetFile);
      return getFallbackUri(value, options);
    }
    finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, request);
  return request;
}

export async function cleanupMobileMediaFileCache(
  options: MobileMediaFileCacheOptions = {},
): Promise<MobileMediaFileCacheCleanupResult> {
  if (!shouldUseNativeDiskCache()) {
    return { deletedCount: 0, remainingSizeBytes: 0 };
  }

  const directory = getCacheDirectory();
  if (!directory.exists) {
    return { deletedCount: 0, remainingSizeBytes: 0 };
  }

  const maxTotalSizeBytes = options.maxTotalSizeBytes ?? DEFAULT_MAX_TOTAL_SIZE_BYTES;
  let deletedCount = 0;
  const files = directory
    .list()
    .filter((entry): entry is File => "size" in entry && "delete" in entry);
  const validFiles: File[] = [];
  let totalSize = 0;

  for (const file of files) {
    if (!isUsableCachedFile(file, options)) {
      if (deleteFileBestEffort(file)) {
        deletedCount += 1;
      }
      continue;
    }
    validFiles.push(file);
    totalSize += file.size;
  }

  if (totalSize > maxTotalSizeBytes) {
    validFiles.sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));
    for (const file of validFiles) {
      if (totalSize <= maxTotalSizeBytes) {
        break;
      }
      const size = file.size;
      if (deleteFileBestEffort(file)) {
        totalSize -= size;
        deletedCount += 1;
      }
    }
  }

  return {
    deletedCount,
    remainingSizeBytes: Math.max(0, totalSize),
  };
}

export function resetMobileMediaFileCacheForTests(): void {
  failedKeys.clear();
  inflightRequests.clear();
}
