import { afterEach, describe, expect, it, vi } from "vitest";

import { queryClient } from "@/queryClient";

import { loginUser, logoutUser } from "./authapi";

const {
  getUserInfoByUsernameMock,
  loginMock,
  logoutMock,
} = vi.hoisted(() => ({
  getUserInfoByUsernameMock: vi.fn(),
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock("../../../api/instance", () => ({
  tuanchat: {
    userController: {
      getUserInfoByUsername: getUserInfoByUsernameMock,
      login: loginMock,
      logout: logoutMock,
    },
  },
}));

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

function installLocalStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

describe("authapi query cache boundary", () => {
  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    if (previousLocalStorage) {
      Object.defineProperty(globalThis, "localStorage", previousLocalStorage);
      return;
    }
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("登录成功后会清空上一账号的 React Query 缓存", async () => {
    installLocalStorage();
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [{ spaceId: 1 }] });
    loginMock.mockResolvedValueOnce({ success: true, data: "token-new" });

    await loginUser({ username: "1001", password: "pwd" }, "userId");

    expect(queryClient.getQueryData(["getUserSpaces"])).toBeUndefined();
    expect(localStorage.getItem("token")).toBe("token-new");
    expect(localStorage.getItem("uid")).toBe("1001");
  });

  it("退出登录时会清空当前账号的 React Query 缓存", async () => {
    installLocalStorage();
    localStorage.setItem("token", "token-old");
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [{ spaceId: 1 }] });
    logoutMock.mockResolvedValueOnce({ success: true });

    await logoutUser();

    expect(queryClient.getQueryData(["getUserSpaces"])).toBeUndefined();
    expect(localStorage.getItem("token")).toBeNull();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
