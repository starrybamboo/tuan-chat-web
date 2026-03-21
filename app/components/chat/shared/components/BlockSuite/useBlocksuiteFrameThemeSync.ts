import type { RefObject } from "react";

import { useEffect } from "react";

import { getCurrentAppTheme, getPostMessageTargetOrigin } from "./blocksuiteDescriptionEditor.shared";

type UseBlocksuiteFrameThemeSyncParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  instanceId: string;
};

export function useBlocksuiteFrameThemeSync(params: UseBlocksuiteFrameThemeSyncParams) {
  const { iframeRef, instanceId } = params;

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const postTheme = () => {
      const theme = getCurrentAppTheme();
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            tc: "tc-blocksuite-frame",
            instanceId,
            type: "theme",
            theme,
          },
          getPostMessageTargetOrigin(),
        );
      }
      catch {
      }
    };

    postTheme();

    const root = document.documentElement;
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        postTheme();
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
  }, [iframeRef, instanceId]);
}
