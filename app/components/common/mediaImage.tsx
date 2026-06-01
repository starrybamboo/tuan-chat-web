import type { ImgHTMLAttributes, Ref, SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  logPersistentMediaImageDebug,
  rememberPersistentMediaImageDerivedAvailable,
  rememberPersistentMediaImageDerivedMissing,
  resetPersistentMediaImageCacheForTests,
  resolveMediaImageOriginalFallbackSrc,
  resolvePersistentMediaImageSrcSync,
  startPersistentMediaImageDerivativeProbe,
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
    image.crossOrigin = "anonymous";
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
    rememberPersistentMediaImageDerivedAvailable(preferredSrc);
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
    const nextSrc = resolvePersistentMediaImageSrcSync(normalizedSrc) || normalizedFallbackSrc || normalizedSrc;
    logPersistentMediaImageDebug("component.effect", {
      normalizedSrc,
      fallbackSrc: normalizedFallbackSrc,
      nextSrc,
    });
    setCurrentSrc(nextSrc);
    startPersistentMediaImageDerivativeProbe(nextSrc);
  }, [normalizedSrc, normalizedFallbackSrc]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const loadedSrc = event.currentTarget.currentSrc || event.currentTarget.src || currentSrc;
    logPersistentMediaImageDebug("component.load", {
      normalizedSrc,
      currentSrc,
      loadedSrc,
    });
    rememberPersistentMediaImageDerivedAvailable(loadedSrc);
    externalOnLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src || currentSrc || normalizedSrc;
    const originalFallbackSrc = resolveMediaOriginalFallbackSrc(failedSrc);
    logPersistentMediaImageDebug("component.error", {
      normalizedSrc,
      currentSrc,
      failedSrc,
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
      src={currentSrc || normalizedFallbackSrc || normalizedSrc || ""}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
