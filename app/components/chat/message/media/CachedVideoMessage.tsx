import { useEffect, useRef } from "react";

import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";
import { acquireCachedVideoElement } from "@/components/chat/infra/videoMessage/videoElementCache";

type CachedVideoMessageProps = {
  cacheKey: string;
  url: string;
  className?: string;
};

export default function CachedVideoMessage({ cacheKey, url, className }: CachedVideoMessageProps) {
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
    }
    catch (e) {
      console.error("[tc-video-message] acquire cached video failed", e);
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
  }, [cacheKey, className, url]);

  return <div ref={mountRef} />;
}
