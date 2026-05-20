export type CachedImagePointerEvents = "auto" | "none" | "box-none" | "box-only";

export const DEFAULT_CACHED_IMAGE_POINTER_EVENTS: CachedImagePointerEvents = "none";

export function resolveCachedImagePointerEvents(
  pointerEvents: CachedImagePointerEvents | undefined,
): CachedImagePointerEvents {
  return pointerEvents ?? DEFAULT_CACHED_IMAGE_POINTER_EVENTS;
}
