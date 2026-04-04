const FFMPEG_ASSET_CACHE_NAME = "ffmpeg-asset-cache-v1";

const blobUrlCache = new Map<string, string>();
const inflightBlobUrlPromiseMap = new Map<string, Promise<string>>();

function normalizeFfmpegAssetUrl(url: string): string | null {
  try {
    if (typeof window === "undefined") {
      const parsed = new URL(String(url ?? "").trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return parsed.toString();
    }

    const parsed = new URL(String(url ?? "").trim(), window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  }
  catch {
    return null;
  }
}

async function openFfmpegAssetCache(): Promise<Cache | null> {
  if (typeof globalThis === "undefined" || !("caches" in globalThis)) {
    return null;
  }

  try {
    return await globalThis.caches.open(FFMPEG_ASSET_CACHE_NAME);
  }
  catch (error) {
    console.warn("[ffmpegAssetCache] 打开 CacheStorage 失败:", error);
    return null;
  }
}

async function createBlobUrlFromResponse(response: Response, mimeType: string): Promise<string> {
  const blob = await response.blob();
  if (!mimeType || blob.type === mimeType) {
    return URL.createObjectURL(blob);
  }

  const typedBlob = new Blob([await blob.arrayBuffer()], { type: mimeType });
  return URL.createObjectURL(typedBlob);
}

async function readBlobUrlFromPersistentCache(url: string, mimeType: string): Promise<string | null> {
  const cache = await openFfmpegAssetCache();
  if (!cache) {
    return null;
  }

  const response = await cache.match(url);
  if (!response?.ok) {
    return null;
  }

  return await createBlobUrlFromResponse(response, mimeType);
}

async function fetchAssetResponse(url: string, timeoutMs: number): Promise<Response> {
  const shouldAbort = Number.isFinite(timeoutMs) && timeoutMs > 0;
  const controller = shouldAbort ? new AbortController() : undefined;
  const timer = shouldAbort
    ? globalThis.setTimeout(() => controller?.abort(), timeoutMs)
    : undefined;

  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: controller?.signal,
    });
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }
    return response;
  }
  finally {
    if (typeof timer === "number") {
      globalThis.clearTimeout(timer);
    }
  }
}

async function writeResponseIntoPersistentCache(url: string, response: Response): Promise<void> {
  const cache = await openFfmpegAssetCache();
  if (!cache) {
    return;
  }

  try {
    await cache.put(url, response);
  }
  catch (error) {
    console.warn("[ffmpegAssetCache] 写入 CacheStorage 失败:", error);
  }
}

export async function resolvePersistentFfmpegAssetBlobUrl(
  url: string,
  mimeType: string,
  timeoutMs: number,
): Promise<string> {
  const normalizedUrl = normalizeFfmpegAssetUrl(url);
  if (!normalizedUrl) {
    return url;
  }

  const existingBlobUrl = blobUrlCache.get(normalizedUrl);
  if (existingBlobUrl) {
    return existingBlobUrl;
  }

  const existingInflight = inflightBlobUrlPromiseMap.get(normalizedUrl);
  if (existingInflight) {
    return await existingInflight;
  }

  const loadPromise = (async () => {
    const cachedBlobUrl = await readBlobUrlFromPersistentCache(normalizedUrl, mimeType);
    if (cachedBlobUrl) {
      blobUrlCache.set(normalizedUrl, cachedBlobUrl);
      return cachedBlobUrl;
    }

    const response = await fetchAssetResponse(normalizedUrl, timeoutMs);
    await writeResponseIntoPersistentCache(normalizedUrl, response.clone());

    const blobUrl = await createBlobUrlFromResponse(response, mimeType);
    blobUrlCache.set(normalizedUrl, blobUrl);
    return blobUrl;
  })().finally(() => {
    inflightBlobUrlPromiseMap.delete(normalizedUrl);
  });

  inflightBlobUrlPromiseMap.set(normalizedUrl, loadPromise);

  try {
    return await loadPromise;
  }
  catch (error) {
    console.warn("[ffmpegAssetCache] 解析资源失败，回退直链:", error);
    return normalizedUrl;
  }
}

export function resetFfmpegAssetCacheForTests(): void {
  for (const blobUrl of blobUrlCache.values()) {
    try {
      URL.revokeObjectURL(blobUrl);
    }
    catch {
      // ignore
    }
  }
  blobUrlCache.clear();
  inflightBlobUrlPromiseMap.clear();
}
