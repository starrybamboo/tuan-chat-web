import { afterEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  recoverAuthTokenFromSessionMock,
  handleUnauthorizedMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  recoverAuthTokenFromSessionMock: vi.fn(),
  handleUnauthorizedMock: vi.fn(),
}));

vi.mock("./authRecovery", () => ({
  recoverAuthTokenFromSession: recoverAuthTokenFromSessionMock,
}));

vi.mock("@/utils/auth/unauthorized", () => ({
  handleUnauthorized: handleUnauthorizedMock,
}));

import { fetchWithUnifiedAuth } from "./unifiedAuthFetch";

function createMockStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
}

describe("fetchWithUnifiedAuth", () => {
  const localStorage = createMockStorage();

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("会为请求附加本地 token 和 include credentials", async () => {
    vi.stubGlobal("window", {
      localStorage,
      location: {
        href: "https://test.tuan.chat/ai-image",
        origin: "https://test.tuan.chat",
      },
      isSecureContext: true,
    });
    window.localStorage.setItem("token", "local-token");
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithUnifiedAuth("https://test.tuan.chat/api/novelapi/ai/generate-image", {
      method: "POST",
      headers: {
        Accept: "application/octet-stream",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer local-token");
    expect(headers.get("Accept")).toBe("application/octet-stream");
    expect(init.credentials).toBe("include");
  });

  it("401 后恢复成功时会重试原请求", async () => {
    vi.stubGlobal("window", {
      localStorage,
      location: {
        href: "https://test.tuan.chat/ai-image",
        origin: "https://test.tuan.chat",
      },
      isSecureContext: true,
    });
    window.localStorage.setItem("token", "expired-token");
    fetchMock
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    recoverAuthTokenFromSessionMock.mockResolvedValue("new-token");
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithUnifiedAuth("https://test.tuan.chat/api/novelapi/ai/generate-image");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recoverAuthTokenFromSessionMock).toHaveBeenCalledWith("https://test.tuan.chat/api");
    expect(handleUnauthorizedMock).not.toHaveBeenCalled();
  });

  it("401 后恢复失败时会触发统一未授权处理", async () => {
    vi.stubGlobal("window", {
      localStorage,
      location: {
        href: "https://test.tuan.chat/ai-image",
        origin: "https://test.tuan.chat",
      },
      isSecureContext: true,
    });
    window.localStorage.setItem("token", "expired-token");
    fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401, statusText: "Unauthorized" }));
    recoverAuthTokenFromSessionMock.mockResolvedValue(null);
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithUnifiedAuth("https://test.tuan.chat/api/novelapi/ai/generate-image");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handleUnauthorizedMock).toHaveBeenCalledWith({ source: "http" });
  });
});
