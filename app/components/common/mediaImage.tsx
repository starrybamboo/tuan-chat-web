import type { ImgHTMLAttributes, Ref, SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { imageOriginalUrlFromUrl } from "@/utils/mediaUrl";

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  ref?: Ref<HTMLImageElement>;
};

function normalizeImageSrc(src: string | null | undefined): string {
  return typeof src === "string" ? src.trim() : "";
}

export function resolveMediaOriginalFallbackSrc(src: string | null | undefined): string | undefined {
  const normalized = normalizeImageSrc(src);
  if (!normalized) {
    return undefined;
  }
  const originalSrc = imageOriginalUrlFromUrl(normalized);
  return originalSrc !== normalized ? originalSrc : undefined;
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

  try {
    return await loadImageOnce(normalized);
  }
  catch (error) {
    const originalFallbackSrc = resolveMediaOriginalFallbackSrc(normalized);
    if (!originalFallbackSrc) {
      throw error;
    }
    return await loadImageOnce(originalFallbackSrc);
  }
}

export function MediaImage({
  fallbackSrc,
  onError: externalOnError,
  ref,
  src,
  ...props
}: MediaImageProps) {
  const normalizedSrc = useMemo(() => normalizeImageSrc(src), [src]);
  const normalizedFallbackSrc = useMemo(() => normalizeImageSrc(fallbackSrc), [fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);
  const fallbackStageRef = useRef<"initial" | "original" | "fallback">("initial");

  useEffect(() => {
    fallbackStageRef.current = "initial";
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc, normalizedFallbackSrc]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const originalFallbackSrc = resolveMediaOriginalFallbackSrc(currentSrc || normalizedSrc);
    if (fallbackStageRef.current === "initial" && originalFallbackSrc) {
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

  const displaySrc = currentSrc || normalizedFallbackSrc;
  if (!displaySrc) {
    return null;
  }

  return (
    <img
      {...props}
      ref={ref}
      src={displaySrc}
      onError={handleError}
    />
  );
}
