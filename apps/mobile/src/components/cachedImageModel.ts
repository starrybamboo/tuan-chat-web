import { imageOriginalUrlFromUrl } from "@tuanchat/domain/media-url";

export type CachedImagePointerEvents = "auto" | "none" | "box-none" | "box-only";

export const DEFAULT_CACHED_IMAGE_POINTER_EVENTS: CachedImagePointerEvents = "none";

export function resolveCachedImagePointerEvents(
  pointerEvents: CachedImagePointerEvents | undefined,
): CachedImagePointerEvents {
  return pointerEvents ?? DEFAULT_CACHED_IMAGE_POINTER_EVENTS;
}

export function resolveCachedImageOriginalFallbackUri(uri: string | null | undefined): string | null {
  const normalizedUri = typeof uri === "string" ? uri.trim() : "";
  if (!normalizedUri) {
    return null;
  }
  const originalUri = imageOriginalUrlFromUrl(normalizedUri);
  return originalUri !== normalizedUri ? originalUri : null;
}
