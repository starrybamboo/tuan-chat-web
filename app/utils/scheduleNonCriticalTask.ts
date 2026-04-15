type ScheduleNonCriticalTaskOptions = {
  delayMs?: number;
  idleTimeoutMs?: number;
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

  const runTask = () => {
    if (!cancelled) {
      task();
    }
  };

  const queueIdleTask = () => {
    if (cancelled) {
      return;
    }

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(runTask, { timeout: idleTimeoutMs });
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

    if (idleId !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleId);
    }
  };
}
