import { describe, expect, it, vi } from "vitest";

import {
  installPreloadErrorRecovery,
  shouldReloadForPreloadError,
} from "./preloadErrorRecovery";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    removeItem: vi.fn(() => {
      value = null;
    }),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

function createRuntime(storage = createStorage()) {
  const listeners = new Map<string, EventListener>();
  const reload = vi.fn();
  const targetWindow = {
    addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
    clearTimeout,
    location: { reload },
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    sessionStorage: storage,
    setTimeout,
  } as unknown as Window;
  return { listeners, reload, storage, targetWindow };
}

describe("preloadErrorRecovery", () => {
  it("首次动态模块加载失败时阻止异常并刷新页面", () => {
    const { listeners, reload, storage, targetWindow } = createRuntime();
    const cleanup = installPreloadErrorRecovery(targetWindow, {
      markerClearDelayMs: 60_000,
      now: () => 1_000,
    });
    const preventDefault = vi.fn();

    listeners.get("vite:preloadError")?.({ preventDefault } as unknown as Event);

    expect(storage.setItem).toHaveBeenCalledWith("tc:preload-error-reload-at", "1000");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    cleanup();
  });

  it("冷却期内再次失败时保留错误边界并避免刷新循环", () => {
    const { listeners, reload, targetWindow } = createRuntime(createStorage("1000"));
    const cleanup = installPreloadErrorRecovery(targetWindow, {
      markerClearDelayMs: 60_000,
      now: () => 2_000,
    });
    const preventDefault = vi.fn();

    listeners.get("vite:preloadError")?.({ preventDefault } as unknown as Event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    cleanup();
  });

  it("成功启动一段时间后清理恢复标记", () => {
    vi.useFakeTimers();
    const storage = createStorage("1000");
    const { targetWindow } = createRuntime(storage);
    const cleanup = installPreloadErrorRecovery(targetWindow, { markerClearDelayMs: 15_000 });

    vi.advanceTimersByTime(15_000);

    expect(storage.removeItem).toHaveBeenCalledWith("tc:preload-error-reload-at");
    cleanup();
    vi.useRealTimers();
  });

  it("只允许超过冷却期的旧标记再次触发恢复", () => {
    expect(shouldReloadForPreloadError(null, 1_000)).toBe(true);
    expect(shouldReloadForPreloadError("invalid", 1_000)).toBe(true);
    expect(shouldReloadForPreloadError("1000", 30_000)).toBe(false);
    expect(shouldReloadForPreloadError("1000", 61_000)).toBe(true);
  });
});
