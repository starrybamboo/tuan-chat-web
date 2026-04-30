import { useEffect } from "react";

type UseBlocksuiteFramePrewarmParams = {
  enabled: boolean;
  eager?: boolean;
  fallbackDelayMs?: number;
  idleTimeoutMs?: number;
  prewarmKey?: string | number | null;
  startDelayMs?: number;
};

type IdleCallbackHandle = number;
type IdleCallbackOptions = {
  timeout?: number;
};
type IdleCallbackWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleCallbackOptions) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

let warmFrameModulePromise: Promise<typeof import("./shared/warmFrame")> | null = null;

function ensureBlocksuiteFramePrewarm() {
  warmFrameModulePromise ??= import("./shared/warmFrame");
  return warmFrameModulePromise.then(module => module.ensurePrewarmedBlocksuiteFrame());
}

export function useBlocksuiteFramePrewarm(params: UseBlocksuiteFramePrewarmParams) {
  const {
    enabled,
    eager = false,
    fallbackDelayMs = 3000,
    idleTimeoutMs = 5000,
    prewarmKey,
    startDelayMs = 2000,
  } = params;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (eager) {
      void ensureBlocksuiteFramePrewarm();
      return;
    }

    const idleWindow = window as IdleCallbackWindow;
    let fallbackTimeoutId: number | null = null;
    let idleId: IdleCallbackHandle | null = null;
    let startTimeoutId: number | null = null;

    const runPrewarm = () => {
      void ensureBlocksuiteFramePrewarm();
    };

    const scheduleIdlePrewarm = () => {
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleId = idleWindow.requestIdleCallback(() => {
          runPrewarm();
        }, { timeout: idleTimeoutMs });
        return;
      }

      fallbackTimeoutId = window.setTimeout(() => {
        runPrewarm();
      }, fallbackDelayMs);
    };

    // 先让聊天首屏和关键接口完成，再占用空闲时间预热文档 iframe。
    startTimeoutId = window.setTimeout(scheduleIdlePrewarm, startDelayMs);

    return () => {
      if (startTimeoutId != null) {
        window.clearTimeout(startTimeoutId);
      }
      if (fallbackTimeoutId != null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      if (idleId != null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [eager, enabled, fallbackDelayMs, idleTimeoutMs, prewarmKey, startDelayMs]);
}
