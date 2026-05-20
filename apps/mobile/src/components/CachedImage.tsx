import type { ImageProps } from "expo-image";

import { Image } from "expo-image";
import { useEffect, useState } from "react";

import { getCachedImageUriSync, resolveCachedImageUri } from "@/lib/mobile-image-cache";

import { resolveCachedImagePointerEvents } from "./cachedImageModel";

type CachedImagePointerEventsProp = Parameters<typeof resolveCachedImagePointerEvents>[0];

type CachedImageProps = Omit<ImageProps, "pointerEvents" | "source"> & {
  pointerEvents?: CachedImagePointerEventsProp;
  uri: string | null | undefined;
};

export function CachedImage({ pointerEvents, uri, ...props }: CachedImageProps) {
  const [asyncResolvedImage, setAsyncResolvedImage] = useState<{ resolvedUri: string; uri: string } | null>(null);
  const resolvedPointerEvents = resolveCachedImagePointerEvents(pointerEvents);
  const syncResolvedUri = getCachedImageUriSync(uri);
  const asyncResolvedUri = asyncResolvedImage && asyncResolvedImage.uri === uri ? asyncResolvedImage.resolvedUri : null;
  const resolvedUri = syncResolvedUri ?? asyncResolvedUri;

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

  if (!resolvedUri) {
    return null;
  }

  return (
    <Image
      cachePolicy="memory-disk"
      pointerEvents={resolvedPointerEvents}
      recyclingKey={resolvedUri}
      source={{ uri: resolvedUri }}
      {...props}
    />
  );
}
