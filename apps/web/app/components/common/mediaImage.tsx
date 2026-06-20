import type { ImgHTMLAttributes, Ref, SyntheticEvent } from "react";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  logPersistentMediaImageDebug,
  rememberPersistentMediaImageDerivedMissing,
  resetPersistentMediaImageCacheForTests,
  resolveMediaImageOriginalFallbackSrc,
  resolvePersistentMediaImageSrcSync,
} from "./mediaPersistentImageCache";

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  ref?: Ref<HTMLImageElement>;
};

function normalizeImageSrc(src: string | null | undefined): string {
  return typeof src === "string" ? src.trim() : "";
}

export function resetMediaImageResolvedSrcCacheForTests(): void {
  resetPersistentMediaImageCacheForTests();
}

export function resolveMediaOriginalFallbackSrc(src: string | null | undefined): string | undefined {
  return resolveMediaImageOriginalFallbackSrc(src);
}

function loadImageOnce(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function loadMediaImageWithOriginalFallback(src: string | null | undefined): Promise<HTMLImageElement> {
  const normalized = normalizeImageSrc(src);
  if (!normalized) {
    throw new Error("Image src is empty");
  }

  const preferredSrc = resolvePersistentMediaImageSrcSync(normalized) || normalized;
  try {
    const image = await loadImageOnce(preferredSrc);
    return image;
  }
  catch (error) {
    const originalFallbackSrc = resolveMediaOriginalFallbackSrc(preferredSrc);
    if (!originalFallbackSrc) {
      throw error;
    }
    rememberPersistentMediaImageDerivedMissing(preferredSrc);
    return await loadImageOnce(originalFallbackSrc);
  }
}

export function MediaImage({
  fallbackSrc,
  onError: externalOnError,
  onLoad: externalOnLoad,
  ref,
  src,
  ...props
}: MediaImageProps) {
  const normalizedSrc = useMemo(() => normalizeImageSrc(src), [src]);
  const normalizedFallbackSrc = useMemo(() => normalizeImageSrc(fallbackSrc), [fallbackSrc]);
  const preferredSrc = useMemo(() => resolvePersistentMediaImageSrcSync(normalizedSrc), [normalizedSrc]);
  const [currentSrc, setCurrentSrc] = useState(() => preferredSrc || normalizedFallbackSrc || normalizedSrc);
  const fallbackStageRef = useRef<"initial" | "original" | "fallback">("initial");

  useEffect(() => {
    fallbackStageRef.current = "initial";
    const resolvedDisplaySrc = resolvePersistentMediaImageSrcSync(normalizedSrc) || normalizedFallbackSrc || normalizedSrc;
    logPersistentMediaImageDebug("component.resolve_display_src", {
      propSrc: normalizedSrc,
      fallbackPropSrc: normalizedFallbackSrc,
      resolvedDisplaySrc,
    });
    setCurrentSrc(resolvedDisplaySrc);
  }, [normalizedSrc, normalizedFallbackSrc]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const loadedSrc = event.currentTarget.currentSrc || event.currentTarget.src || currentSrc;
    logPersistentMediaImageDebug("component.dom_load", {
      propSrc: normalizedSrc,
      renderedSrc: currentSrc,
      loadedBrowserSrc: loadedSrc,
    });
    externalOnLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src || currentSrc || normalizedSrc;
    const originalFallbackSrc = resolveMediaOriginalFallbackSrc(failedSrc);
    logPersistentMediaImageDebug("component.dom_error", {
      propSrc: normalizedSrc,
      renderedSrc: currentSrc,
      failedBrowserSrc: failedSrc,
      originalFallbackSrc,
      stage: fallbackStageRef.current,
    });

    if (fallbackStageRef.current === "initial" && originalFallbackSrc) {
      rememberPersistentMediaImageDerivedMissing(failedSrc || normalizedSrc);
      fallbackStageRef.current = "original";
      setCurrentSrc(originalFallbackSrc);
      return;
    }

    if (normalizedFallbackSrc && fallbackStageRef.current !== "fallback" && normalizedFallbackSrc !== currentSrc) {
      fallbackStageRef.current = "fallback";
      setCurrentSrc(normalizedFallbackSrc);
      return;
    }

    externalOnError?.(event);
  };

  if (!normalizedSrc && !normalizedFallbackSrc) {
    return null;
  }

  return (
    <img
      {...props}
      ref={ref}
      src={currentSrc || undefined}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
