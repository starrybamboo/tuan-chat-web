import type { RefObject } from "react";

import { useEffect } from "react";

type UseBlocksuiteFrameThemeSyncParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  flushFrameSync: (reason: string) => void;
};

export function useBlocksuiteFrameThemeSync(params: UseBlocksuiteFrameThemeSyncParams) {
  const { iframeRef, flushFrameSync } = params;

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const syncTheme = () => {
      if (!iframeRef.current?.contentWindow)
        return;
      flushFrameSync("theme-change");
    };

    syncTheme();

    const root = document.documentElement;
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        syncTheme();
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    }
    catch {
      observer = null;
    }

    return () => {
      try {
        observer?.disconnect?.();
      }
      catch {
      }
    };
  }, [flushFrameSync, iframeRef]);
}
