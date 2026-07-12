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

/** 将远程图片解析为永久缓存中的本地文件 URI。 */
export function useCachedImageUri(uri: string | null | undefined) {
  const [asyncResolvedImage, setAsyncResolvedImage] = useState<{ resolvedUri: string; uri: string } | null>(null);
  const syncResolvedUri = getCachedImageUriSync(uri);
  const asyncResolvedUri = asyncResolvedImage && asyncResolvedImage.uri === uri ? asyncResolvedImage.resolvedUri : null;

  useEffect(() => {
    const nextUri = getCachedImageUriSync(uri);
    if (nextUri || !uri) {
      return;
    }

    let cancelled = false;
    void resolveCachedImageUri(uri).then((cachedUri) => {
      if (!cancelled && cachedUri) {
        setAsyncResolvedImage({ resolvedUri: cachedUri, uri });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return syncResolvedUri ?? asyncResolvedUri;
}

export function CachedImage({ onError: externalOnError, pointerEvents, uri, ...props }: CachedImageProps) {
  const [fallbackImage, setFallbackImage] = useState<{ fallbackUri: string; sourceUri: string | null | undefined } | null>(null);
  const resolvedPointerEvents = resolveCachedImagePointerEvents(pointerEvents);
  const requestedUri = fallbackImage && fallbackImage.sourceUri === uri ? fallbackImage.fallbackUri : uri;
  const resolvedUri = useCachedImageUri(requestedUri);

  if (!resolvedUri) {
    return null;
  }

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    if (fallbackImage?.sourceUri !== uri) {
      const fallbackUri = resolveCachedImageOriginalFallbackUri(requestedUri);
      if (fallbackUri) {
        setFallbackImage({ fallbackUri, sourceUri: uri });
        return;
      }
    }
    externalOnError?.(event);
  };

  return (
    <Image
      cachePolicy="memory"
      pointerEvents={resolvedPointerEvents}
      recyclingKey={resolvedUri}
      source={{ uri: resolvedUri }}
      {...props}
      onError={handleError}
    />
  );
}
