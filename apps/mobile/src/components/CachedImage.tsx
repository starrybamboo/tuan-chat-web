import type { ImageProps } from "expo-image";

import { Image } from "expo-image";
import { useEffect, useState } from "react";

import { getCachedImageUriSync, resolveCachedImageUri } from "@/lib/mobile-image-cache";

import { resolveCachedImageOriginalFallbackUri, resolveCachedImagePointerEvents } from "./cachedImageModel";

type CachedImagePointerEventsProp = Parameters<typeof resolveCachedImagePointerEvents>[0];

type CachedImageProps = Omit<ImageProps, "pointerEvents" | "source"> & {
  pointerEvents?: CachedImagePointerEventsProp;
  uri: string | null | undefined;
};

export function CachedImage({ onError: externalOnError, pointerEvents, uri, ...props }: CachedImageProps) {
  const [fallbackImage, setFallbackImage] = useState<{ fallbackUri: string; sourceUri: string | null | undefined } | null>(null);
  const [asyncResolvedImage, setAsyncResolvedImage] = useState<{ resolvedUri: string; uri: string } | null>(null);
  const resolvedPointerEvents = resolveCachedImagePointerEvents(pointerEvents);
  const requestedUri = fallbackImage && fallbackImage.sourceUri === uri ? fallbackImage.fallbackUri : uri;
  const syncResolvedUri = getCachedImageUriSync(requestedUri);
  const asyncResolvedUri = asyncResolvedImage && asyncResolvedImage.uri === requestedUri ? asyncResolvedImage.resolvedUri : null;
  const resolvedUri = syncResolvedUri ?? asyncResolvedUri;

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
    if (fallbackImage?.sourceUri !== uri) {
      const fallbackUri = resolveCachedImageOriginalFallbackUri(requestedUri);
      if (fallbackUri) {
        setAsyncResolvedImage(null);
        setFallbackImage({ fallbackUri, sourceUri: uri });
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
