type ScheduleNonCriticalTaskOptions = {
  delayMs?: number;
  idleTimeoutMs?: number;
};

type IdleCapableWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function scheduleNonCriticalTask(
  task: () => void,
  { delayMs = 1200, idleTimeoutMs = 2000 }: ScheduleNonCriticalTaskOptions = {},
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let delayTimeoutId: number | null = null;
  let fallbackTimeoutId: number | null = null;
  let idleId: number | null = null;
  let cancelled = false;
  const idleWindow = window as IdleCapableWindow;

  const runTask = () => {
    if (!cancelled) {
      task();
    }
  };

  const queueIdleTask = () => {
    if (cancelled) {
      return;
    }

    const requestIdleCallback = typeof idleWindow.requestIdleCallback === "function"
      ? idleWindow.requestIdleCallback.bind(idleWindow)
      : null;
    if (requestIdleCallback) {
      idleId = requestIdleCallback(runTask, { timeout: idleTimeoutMs });
      return;
    }

    fallbackTimeoutId = window.setTimeout(runTask, 0);
  };

  const start = () => {
    if (cancelled) {
      return;
    }
    delayTimeoutId = window.setTimeout(queueIdleTask, delayMs);
  };

  if (document.readyState === "complete") {
    start();
  }
  else {
    window.addEventListener("load", start, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("load", start);

    if (delayTimeoutId !== null) {
      window.clearTimeout(delayTimeoutId);
    }

    if (fallbackTimeoutId !== null) {
      window.clearTimeout(fallbackTimeoutId);
    }

    const cancelIdleCallback = typeof idleWindow.cancelIdleCallback === "function"
      ? idleWindow.cancelIdleCallback.bind(idleWindow)
      : null;
    if (idleId !== null && cancelIdleCallback) {
      cancelIdleCallback(idleId);
    }
  };
}
