import { vi } from "vitest";

import { consumeAuthToast, handleUnauthorized } from "./unauthorized";

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

type MockLocation = {
  pathname: string;
  search: string;
  hash: string;
  assign: ReturnType<typeof vi.fn>;
};

function installMockWindow(pathname: string, search = "", hash = ""): MockLocation {
  const location: MockLocation = {
    pathname,
    search,
    hash,
    assign: vi.fn(),
  };

  const mockWindow = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    location,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: mockWindow,
  });

  return location;
}

describe("handleUnauthorized", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  afterEach(() => {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
      return;
    }
    delete (globalThis as { window?: unknown }).window;
  });

  it("在登录页触发时，不应写入过期提示或执行跳转", () => {
    const location = installMockWindow("/login");
    window.localStorage.setItem("token", "token-value");
    window.localStorage.setItem("uid", "1001");

    handleUnauthorized({ source: "http" });

    expect(window.localStorage.getItem("token")).toBeNull();
    expect(window.localStorage.getItem("uid")).toBeNull();
    expect(window.sessionStorage.getItem("tc:auth:toast")).toBeNull();
    expect(window.sessionStorage.getItem("tc:auth:lastUnauthorizedAt")).toBeNull();
    expect(location.assign).not.toHaveBeenCalled();
  });

  it("在普通页面触发时，保留原有重定向与提示行为", () => {
    const location = installMockWindow("/chat/1/2", "?tab=room", "#msg");
    window.localStorage.setItem("token", "token-value");
    window.localStorage.setItem("uid", "1001");

    handleUnauthorized({ source: "http" });

    expect(window.localStorage.getItem("token")).toBeNull();
    expect(window.localStorage.getItem("uid")).toBeNull();
    expect(window.sessionStorage.getItem("tc:auth:lastUnauthorizedAt")).not.toBeNull();
    expect(consumeAuthToast()).toBe("登录已过期，请重新登录");
    expect(location.assign).toHaveBeenCalledWith("/login?redirect=%2Fchat%2F1%2F2%3Ftab%3Droom%23msg");
  });
});
