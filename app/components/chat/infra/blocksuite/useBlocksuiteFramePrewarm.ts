import { useEffect } from "react";

import { ensurePrewarmedBlocksuiteFrame } from "./shared/warmFrame";

type UseBlocksuiteFramePrewarmParams = {
  enabled: boolean;
};

type IdleCallbackHandle = number;
type IdleCallbackOptions = {
  timeout?: number;
};
type IdleCallbackWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleCallbackOptions) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export function useBlocksuiteFramePrewarm(params: UseBlocksuiteFramePrewarmParams) {
  const { enabled } = params;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const idleWindow = window as IdleCallbackWindow;
    let timeoutId: number | null = null;
    let idleId: IdleCallbackHandle | null = null;

    const runPrewarm = () => {
      void ensurePrewarmedBlocksuiteFrame();
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(() => {
        runPrewarm();
      }, { timeout: 1200 });

      return () => {
        if (idleId != null && typeof idleWindow.cancelIdleCallback === "function") {
          idleWindow.cancelIdleCallback(idleId);
        }
      };
    }

    timeoutId = window.setTimeout(runPrewarm, 500);
    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled]);
}
