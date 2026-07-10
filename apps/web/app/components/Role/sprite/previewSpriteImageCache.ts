import { loadMediaImageWithOriginalFallback } from "@/components/common/mediaImage";

const DEFAULT_CACHE_LIMIT = 24;

export type PreviewSpriteImageEntry = {
  image: HTMLImageElement;
  bitmap: ImageBitmap | null;
};

type CacheRecord = {
  promise: Promise<PreviewSpriteImageEntry>;
  entry?: PreviewSpriteImageEntry;
  updatedAt: number;
};

const previewSpriteImageCache = new Map<string, CacheRecord>();
let cacheLimit = DEFAULT_CACHE_LIMIT;

function normalizePreviewSpriteUrl(url: string | null | undefined): string {
  return typeof url === "string" ? url.trim() : "";
}

function touchCacheRecord(url: string, record: CacheRecord): void {
  record.updatedAt = Date.now();
  previewSpriteImageCache.delete(url);
  previewSpriteImageCache.set(url, record);
}

function disposePreviewEntry(entry: PreviewSpriteImageEntry | undefined): void {
  try {
    entry?.bitmap?.close();
  }
  catch {
    // 少数运行时可能不允许释放 ImageBitmap；失败不影响预览缓存继续工作。
  }
}

function evictPreviewSpriteImageCache(): void {
  while (previewSpriteImageCache.size > cacheLimit) {
    const oldestUrl = previewSpriteImageCache.keys().next().value as string | undefined;
    if (!oldestUrl) {
      return;
    }
    const oldest = previewSpriteImageCache.get(oldestUrl);
    disposePreviewEntry(oldest?.entry);
    previewSpriteImageCache.delete(oldestUrl);
  }
}

async function createPreviewSpriteBitmap(image: HTMLImageElement): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    return await createImageBitmap(image);
  }
  catch {
    return null;
  }
}

export function loadPreviewSpriteImage(url: string | null | undefined): Promise<PreviewSpriteImageEntry> {
  const normalizedUrl = normalizePreviewSpriteUrl(url);
  if (!normalizedUrl) {
    return Promise.reject(new Error("Preview sprite url is empty"));
  }

  const cached = previewSpriteImageCache.get(normalizedUrl);
  if (cached) {
    touchCacheRecord(normalizedUrl, cached);
    return cached.promise;
  }

  const record: CacheRecord = {
    updatedAt: Date.now(),
    promise: loadMediaImageWithOriginalFallback(normalizedUrl)
      .then(async (image) => {
        const entry: PreviewSpriteImageEntry = {
          image,
          bitmap: await createPreviewSpriteBitmap(image),
        };
        record.entry = entry;
        record.updatedAt = Date.now();
        evictPreviewSpriteImageCache();
        return entry;
      })
      .catch((error) => {
        previewSpriteImageCache.delete(normalizedUrl);
        throw error;
      }),
  };

  previewSpriteImageCache.set(normalizedUrl, record);
  evictPreviewSpriteImageCache();
  return record.promise;
}

export function preloadPreviewSpriteImage(url: string | null | undefined): void {
  const normalizedUrl = normalizePreviewSpriteUrl(url);
  if (!normalizedUrl) {
    return;
  }

  void loadPreviewSpriteImage(normalizedUrl).catch(() => {
    // 预热失败不阻断交互；正式切换时仍会重试并记录错误。
  });
}

export function preloadPreviewSpriteImages(urls: Array<string | null | undefined>): void {
  for (const url of urls) {
    preloadPreviewSpriteImage(url);
  }
}

export function resetPreviewSpriteImageCacheForTests(): void {
  for (const record of previewSpriteImageCache.values()) {
    disposePreviewEntry(record.entry);
  }
  previewSpriteImageCache.clear();
  cacheLimit = DEFAULT_CACHE_LIMIT;
}

export function setPreviewSpriteImageCacheLimitForTests(limit: number): void {
  cacheLimit = Math.max(1, Math.floor(limit));
  evictPreviewSpriteImageCache();
}
