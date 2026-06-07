const WEBGAL_ASSET_CACHE_NAME = "webgal-asset-mirror-v1";

const observedAssetUrlSet = new Set<string>();
const mirrorPromiseMap = new Map<string, Promise<void>>();

function normalizeHttpAssetUrl(url: string): string | null {
  try {
    const parsed = new URL(String(url ?? "").trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  }
  catch {
    return null;
  }
}

async function openAssetCache(): Promise<Cache | null> {
  if (typeof globalThis === "undefined" || !("caches" in globalThis)) {
    return null;
  }
  try {
    return await globalThis.caches.open(WEBGAL_ASSET_CACHE_NAME);
  }
  catch (error) {
    console.warn("[browserAssetCache] 打开 CacheStorage 失败:", error);
    return null;
  }
}

async function putResponseIntoAssetCache(url: string, response: Response): Promise<void> {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return;
  }
  const cache = await openAssetCache();
  if (!cache) {
    return;
  }
  await cache.put(normalizedUrl, response);
}

export function markObservedWebgalAsset(url: string): void {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return;
  }
  observedAssetUrlSet.add(normalizedUrl);
}

export function hasObservedWebgalAsset(url: string): boolean {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return false;
  }
  return observedAssetUrlSet.has(normalizedUrl);
}

export async function getMirroredWebgalAssetBlob(url: string): Promise<Blob | null> {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return null;
  }
  const cache = await openAssetCache();
  if (!cache) {
    return null;
  }
  const response = await cache.match(normalizedUrl);
  if (!response) {
    return null;
  }
  return await response.blob();
}

export async function mirrorWebgalAssetBlob(url: string, blob: Blob): Promise<void> {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return;
  }
  const headers = blob.type
    ? { "Content-Type": blob.type }
    : undefined;
  await putResponseIntoAssetCache(normalizedUrl, new Response(blob, { headers }));
}

async function fillMirroredWebgalAssetCache(url: string, options?: { markObserved?: boolean }): Promise<void> {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl) {
    return;
  }
  if (options?.markObserved) {
    markObservedWebgalAsset(normalizedUrl);
  }

  const existingFill = mirrorPromiseMap.get(normalizedUrl);
  if (existingFill) {
    await existingFill;
    return;
  }

  const fillPromise = (async () => {
    const mirroredBlob = await getMirroredWebgalAssetBlob(normalizedUrl);
    if (mirroredBlob) {
      return;
    }

    const response = await fetch(normalizedUrl, { cache: "force-cache" });
    if (!response.ok) {
      return;
    }
    await putResponseIntoAssetCache(normalizedUrl, response.clone());
  })()
    .catch((error) => {
      console.warn("[browserAssetCache] 回填资源镜像缓存失败:", error);
    })
    .finally(() => {
      mirrorPromiseMap.delete(normalizedUrl);
    });

  mirrorPromiseMap.set(normalizedUrl, fillPromise);
  await fillPromise;
}

export async function primeWebgalAssetCache(url: string): Promise<void> {
  await fillMirroredWebgalAssetCache(url, { markObserved: true });
}

export async function backfillMirroredWebgalAssetCache(url: string): Promise<void> {
  await fillMirroredWebgalAssetCache(url, { markObserved: false });
}

export async function fetchObservedWebgalAssetBlob(url: string): Promise<Blob | null> {
  const normalizedUrl = normalizeHttpAssetUrl(url);
  if (!normalizedUrl || !hasObservedWebgalAsset(normalizedUrl)) {
    return null;
  }

  try {
    const response = await fetch(normalizedUrl, { cache: "force-cache" });
    if (!response.ok) {
      return null;
    }
    const clonedResponse = response.clone();
    const blob = await response.blob();
    await putResponseIntoAssetCache(normalizedUrl, clonedResponse);
    return blob;
  }
  catch (error) {
    console.warn("[browserAssetCache] 读取浏览器已见资源失败:", error);
    return null;
  }
}

export function resetWebgalAssetCacheForTests(): void {
  observedAssetUrlSet.clear();
  mirrorPromiseMap.clear();
}
