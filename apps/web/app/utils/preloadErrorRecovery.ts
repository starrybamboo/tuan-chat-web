const PRELOAD_ERROR_RELOAD_AT_KEY = "tc:preload-error-reload-at";
const PRELOAD_ERROR_RELOAD_COOLDOWN_MS = 60_000;
const PRELOAD_ERROR_MARKER_CLEAR_DELAY_MS = 15_000;

type PreloadErrorRecoveryOptions = {
  markerClearDelayMs?: number;
  now?: () => number;
  reloadCooldownMs?: number;
};

function getSessionStorage(targetWindow: Window) {
  try {
    return targetWindow.sessionStorage;
  }
  catch {
    return null;
  }
}

function removeReloadMarker(storage: Storage | null) {
  try {
    storage?.removeItem(PRELOAD_ERROR_RELOAD_AT_KEY);
  }
  catch {
    // 存储不可用时保留现有错误边界，避免刷新循环。
  }
}

export function shouldReloadForPreloadError(
  lastReloadAt: string | null,
  nowMs: number,
  reloadCooldownMs = PRELOAD_ERROR_RELOAD_COOLDOWN_MS,
) {
  if (!lastReloadAt) {
    return true;
  }

  const timestamp = Number(lastReloadAt);
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  const elapsedMs = nowMs - timestamp;
  return elapsedMs >= reloadCooldownMs;
}

/**
 * 动态 chunk 因部署切换失效时刷新一次入口文档；连续失败交给路由错误边界处理。
 */
export function installPreloadErrorRecovery(
  targetWindow: Window = window,
  options: PreloadErrorRecoveryOptions = {},
) {
  const storage = getSessionStorage(targetWindow);
  const now = options.now ?? Date.now;
  const reloadCooldownMs = options.reloadCooldownMs ?? PRELOAD_ERROR_RELOAD_COOLDOWN_MS;
  const markerClearDelayMs = options.markerClearDelayMs ?? PRELOAD_ERROR_MARKER_CLEAR_DELAY_MS;
  const markerCleanupTimer = targetWindow.setTimeout(
    () => removeReloadMarker(storage),
    markerClearDelayMs,
  );

  const handlePreloadError = (event: VitePreloadErrorEvent) => {
    if (!storage) {
      return;
    }

    const nowMs = now();
    let lastReloadAt: string | null;
    try {
      lastReloadAt = storage.getItem(PRELOAD_ERROR_RELOAD_AT_KEY);
    }
    catch {
      return;
    }

    if (!shouldReloadForPreloadError(lastReloadAt, nowMs, reloadCooldownMs)) {
      return;
    }

    try {
      storage.setItem(PRELOAD_ERROR_RELOAD_AT_KEY, String(nowMs));
    }
    catch {
      return;
    }

    event.preventDefault();
    targetWindow.clearTimeout(markerCleanupTimer);
    targetWindow.location.reload();
  };

  targetWindow.addEventListener("vite:preloadError", handlePreloadError);

  return () => {
    targetWindow.clearTimeout(markerCleanupTimer);
    targetWindow.removeEventListener("vite:preloadError", handlePreloadError);
  };
}
