import type { ImageProps } from "expo-image";

import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";

import { getCachedImageUriSync, resolveCachedImageUri } from "@/lib/mobile-image-cache";

import { resolveCachedImageOriginalFallbackUri, resolveCachedImagePointerEvents } from "./cachedImageModel";

type CachedImagePointerEventsProp = Parameters<typeof resolveCachedImagePointerEvents>[0];

type CachedImageProps = Omit<ImageProps, "pointerEvents" | "source"> & {
  pointerEvents?: CachedImagePointerEventsProp;
  uri: string | null | undefined;
};

export function CachedImage({ onError: externalOnError, pointerEvents, uri, ...props }: CachedImageProps) {
  const [requestedUri, setRequestedUri] = useState(uri);
  const [asyncResolvedImage, setAsyncResolvedImage] = useState<{ resolvedUri: string; uri: string } | null>(null);
  const hasTriedOriginalFallbackRef = useRef(false);
  const resolvedPointerEvents = resolveCachedImagePointerEvents(pointerEvents);
  const syncResolvedUri = getCachedImageUriSync(requestedUri);
  const asyncResolvedUri = asyncResolvedImage && asyncResolvedImage.uri === requestedUri ? asyncResolvedImage.resolvedUri : null;
  const resolvedUri = syncResolvedUri ?? asyncResolvedUri;

  useEffect(() => {
    hasTriedOriginalFallbackRef.current = false;
    setAsyncResolvedImage(null);
    setRequestedUri(uri);
  }, [uri]);

  useEffect(() => {
    const nextUri = getCachedImageUriSync(requestedUri);
    if (nextUri || !requestedUri) {
      return;
    }

    let cancelled = false;
    void resolveCachedImageUri(requestedUri).then((cachedUri) => {
      if (!cancelled && cachedUri) {
        setAsyncResolvedImage({ resolvedUri: cachedUri, uri: requestedUri });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [requestedUri]);

  if (!resolvedUri) {
    return null;
  }

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    if (!hasTriedOriginalFallbackRef.current) {
      hasTriedOriginalFallbackRef.current = true;
      const fallbackUri = resolveCachedImageOriginalFallbackUri(requestedUri);
      if (fallbackUri) {
        setAsyncResolvedImage(null);
        setRequestedUri(fallbackUri);
        return;
      }
    }
    externalOnError?.(event);
  };

  return (
    <Image
      cachePolicy="memory-disk"
      pointerEvents={resolvedPointerEvents}
      recyclingKey={resolvedUri}
      source={{ uri: resolvedUri }}
      {...props}
      onError={handleError}
    />
  );
}
