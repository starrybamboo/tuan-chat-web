import { loadMediaImageWithOriginalFallback } from "@/components/common/mediaImage";

export type ImageAssetPrefetchRuntime = {
  loadImage?: (url: string) => Promise<unknown>;
};

const imageAssetPrefetchInflight = new Map<string, Promise<boolean>>();

function normalizeImageAssetUrl(url: string | null | undefined): string {
  return typeof url === "string" ? url.trim() : "";
}

function loadImageAsset(url: string, runtime: ImageAssetPrefetchRuntime): Promise<unknown> {
  return runtime.loadImage?.(url) ?? loadMediaImageWithOriginalFallback(url);
}

export async function prefetchImageAssetUrl(
  url: string | null | undefined,
  runtime: ImageAssetPrefetchRuntime = {},
): Promise<boolean> {
  const normalizedUrl = normalizeImageAssetUrl(url);
  if (!normalizedUrl) {
    return true;
  }

  const inflight = imageAssetPrefetchInflight.get(normalizedUrl);
  if (inflight) {
    return await inflight;
  }

  const request = Promise.resolve()
    .then(() => loadImageAsset(normalizedUrl, runtime))
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      imageAssetPrefetchInflight.delete(normalizedUrl);
    });

  imageAssetPrefetchInflight.set(normalizedUrl, request);
  return await request;
}

export function resetImageAssetPrefetchForTests(): void {
  imageAssetPrefetchInflight.clear();
}
