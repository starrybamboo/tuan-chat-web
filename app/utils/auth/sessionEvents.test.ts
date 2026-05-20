import { describe, expect, it, vi } from "vitest";

import {
  AUTH_SESSION_CHANGED_EVENT,
  dispatchStoredAuthSessionChanged,
  readStoredAuthUserId,
} from "./sessionEvents";

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

function installMockWindow() {
  const listeners = new Map<string, EventListener[]>();
  const localStorage = new MemoryStorage();
  const mockWindow = {
    localStorage,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((event: Event) => {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    }),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: mockWindow,
  });

  return mockWindow;
}

describe("auth session events", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  afterEach(() => {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
      return;
    }
    delete (globalThis as { window?: unknown }).window;
  });

  it("读取 uid 时会忽略非法值", () => {
    const mockWindow = installMockWindow();
    mockWindow.localStorage.setItem("uid", "not-a-number");

    expect(readStoredAuthUserId()).toBeNull();
  });

  it("登录事件以 token 判断登录态，不要求 uid 已经解析完成", () => {
    const mockWindow = installMockWindow();
    mockWindow.localStorage.setItem("token", "token-value");
    const listener = vi.fn<(event: Event) => void>();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, listener);

    dispatchStoredAuthSessionChanged("login");

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      isLoggedIn: true,
      uid: null,
      source: "login",
    });
  });
});
