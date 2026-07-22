import { useEffect, useRef } from "react";

import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";
import { acquireCachedVideoElement } from "@/components/chat/infra/videoMessage/videoElementCache";

export const DEFAULT_CACHED_VIDEO_ASPECT_RATIO = 16 / 9;

type CachedVideoMessageProps = {
  aspectRatio?: number;
  cacheKey: string;
  url: string;
  className?: string;
  onError?: () => void;
}

export default function CachedVideoMessage({
  aspectRatio = DEFAULT_CACHED_VIDEO_ASPECT_RATIO,
  cacheKey,
  url,
  className,
  onError,
}: CachedVideoMessageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount)
      return;
    if (!url)
      return;

    mediaDebug("cached-video", "mount", { cacheKey, url });

    let release: (() => void) | undefined;
    try {
      const acquired = acquireCachedVideoElement({
        cacheKey,
        url,
        container: mount,
        className,
        stopClickPropagation: true,
      });
      release = acquired.release;
      const handleError = () => onError?.();
      acquired.video.addEventListener("error", handleError);

      return () => {
        acquired.video.removeEventListener("error", handleError);
        mediaDebug("cached-video", "unmount", { cacheKey, url });
        try {
          release?.();
        }
        catch {
          // ignore
        }
      };
    }
    catch (e) {
      console.error("[tc-video-message] acquire cached video failed", e);
      onError?.();
    }

    return () => {
      mediaDebug("cached-video", "unmount", { cacheKey, url });
      try {
        release?.();
      }
      catch {
        // ignore
      }
    };
  }, [cacheKey, className, onError, url]);

  return <div ref={mountRef} className="w-full bg-base-200/40" style={{ aspectRatio }} />;
}
