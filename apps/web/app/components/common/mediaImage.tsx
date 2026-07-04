import type { ImgHTMLAttributes, Ref, SyntheticEvent } from "react";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  logPersistentMediaImageDebug,
  rememberPersistentMediaImageDerivedMissing,
  resetPersistentMediaImageCacheForTests,
  resolveMediaImageOriginalFallbackSrc,
  resolvePersistentMediaImageSrcSync,
} from "./mediaPersistentImageCache";

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  loadTransition?: boolean;
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
  className,
  fallbackSrc,
  loadTransition = true,
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [shouldShowLoadingEffect, setShouldShowLoadingEffect] = useState(false);
  const fallbackStageRef = useRef<"initial" | "original" | "fallback">("initial");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const setImageRef = useCallback((element: HTMLImageElement | null) => {
    imageRef.current = element;

    if (typeof ref === "function") {
      return ref(element);
    }

    if (ref) {
      (ref as { current: HTMLImageElement | null }).current = element;
    }

    return undefined;
  }, [ref]);

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

  useLayoutEffect(() => {
    setIsImageLoaded(false);
    setShouldShowLoadingEffect(false);

    if (!loadTransition || !currentSrc) {
      return;
    }

    const imageElement = imageRef.current;
    if (imageElement?.complete && imageElement.naturalWidth > 0) {
      setIsImageLoaded(true);
      return;
    }

    setShouldShowLoadingEffect(true);
  }, [currentSrc, loadTransition]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const loadedSrc = event.currentTarget.currentSrc || event.currentTarget.src || currentSrc;
    logPersistentMediaImageDebug("component.dom_load", {
      propSrc: normalizedSrc,
      renderedSrc: currentSrc,
      loadedBrowserSrc: loadedSrc,
    });
    setIsImageLoaded(true);
    setShouldShowLoadingEffect(false);
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

  const isLoadingEffectVisible = loadTransition && !isImageLoaded && shouldShowLoadingEffect;
  const loadTransitionClassName = loadTransition
    ? `
      transition-[filter,opacity] duration-300 ease-out
      motion-reduce:transition-none
      ${isLoadingEffectVisible ? "blur-sm opacity-85" : "blur-0 opacity-100"}
    `
    : "";

  return (
    <img
      {...props}
      className={`bg-transparent ${className ?? ""} ${loadTransitionClassName}`}
      ref={setImageRef}
      src={currentSrc || undefined}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
