import { afterEach, describe, expect, it, vi } from "vitest";

import { queryClient } from "@/queryClient";

import { checkAuthStatus, getAuthStatusQueryKey, loginUser, logoutUser, registerUser } from "./authapi";

const {
  getUserInfoByUsernameMock,
  getMyUserInfoMock,
  loginMock,
  logoutMock,
  registerMock,
} = vi.hoisted(() => ({
  getUserInfoByUsernameMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getMyUserInfoMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  loginMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  logoutMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  registerMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("../../../api/instance", () => ({
  tuanchat: {
    userController: {
      getUserInfoByUsername: getUserInfoByUsernameMock,
      getMyUserInfo: getMyUserInfoMock,
      login: loginMock,
      logout: logoutMock,
      register: registerMock,
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
    getMyUserInfoMock.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 1001,
      },
    });

    await loginUser({ username: "1001", password: "pwd" }, "userId");

    expect(queryClient.getQueryData(["getUserSpaces"])).toBeUndefined();
    expect(localStorage.getItem("token")).toBe("token-new");
    expect(localStorage.getItem("uid")).toBe("1001");
    expect(queryClient.getQueryData(getAuthStatusQueryKey())).toEqual({
      isLoggedIn: true,
      token: "token-new",
      uid: 1001,
    });
  });

  it("用户名登录后如果无法补全 uid，不应保留旧账号 uid", async () => {
    installLocalStorage();
    localStorage.setItem("uid", "9999");
    loginMock.mockResolvedValueOnce({ success: true, data: "token-new" });
    getMyUserInfoMock.mockRejectedValueOnce(new Error("network"));
    getUserInfoByUsernameMock.mockRejectedValueOnce(new Error("lookup failed"));

    await loginUser({ username: "alice", password: "pwd" }, "username");

    expect(localStorage.getItem("token")).toBe("token-new");
    expect(localStorage.getItem("uid")).toBeNull();
    expect(queryClient.getQueryData(getAuthStatusQueryKey())).toEqual({
      isLoggedIn: true,
      token: "token-new",
    });
  });

  it("注册成功后直接持久化后端返回的登录 token", async () => {
    installLocalStorage();
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [{ spaceId: 1 }] });
    registerMock.mockResolvedValueOnce({ success: true, data: "register-token" });
    getMyUserInfoMock.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 3001,
      },
    });

    await registerUser({ username: "alice", password: "pwd123456", email: "alice@example.com" });

    expect(registerMock).toHaveBeenCalledWith({
      username: "alice",
      password: "pwd123456",
      email: "alice@example.com",
    });
    expect(loginMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["getUserSpaces"])).toBeUndefined();
    expect(localStorage.getItem("token")).toBe("register-token");
    expect(localStorage.getItem("uid")).toBe("3001");
    expect(queryClient.getQueryData(getAuthStatusQueryKey())).toEqual({
      isLoggedIn: true,
      token: "register-token",
      uid: 3001,
    });
  });

  it("checkAuthStatus 会用当前用户信息校准并回填 uid", async () => {
    installLocalStorage();
    localStorage.setItem("token", "token-new");
    getMyUserInfoMock.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 2024,
      },
    });

    const result = await checkAuthStatus();

    expect(result).toEqual({
      isLoggedIn: true,
      token: "token-new",
      uid: 2024,
    });
    expect(localStorage.getItem("uid")).toBe("2024");
  });

  it("退出登录时会清空当前账号的 React Query 缓存", async () => {
    installLocalStorage();
    localStorage.setItem("token", "token-old");
    queryClient.setQueryData(["getUserSpaces"], { success: true, data: [{ spaceId: 1 }] });
    logoutMock.mockResolvedValueOnce({ success: true });

    await logoutUser();

    expect(queryClient.getQueryData(["getUserSpaces"])).toBeUndefined();
    expect(localStorage.getItem("token")).toBeNull();
    expect(queryClient.getQueryData(getAuthStatusQueryKey())).toEqual({ isLoggedIn: false });
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
