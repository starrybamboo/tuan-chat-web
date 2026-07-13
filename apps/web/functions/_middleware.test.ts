import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "./_middleware";

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function createContext(
  request: Request,
  env: Parameters<typeof onRequest>[0]["env"] = {},
) {
  return {
    env,
    next: vi.fn(async () => new Response("next", { status: 200 })),
    request,
  };
}

describe("cloudflare Pages middleware", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("webGAL 资源代理在生产环境直接读取团剧媒体，不转发到后端 API", async () => {
    const fetchMock = vi.fn<FetchHandler>(async () => new Response("avatar", {
      headers: {
        "cache-control": "public, max-age=31536000",
        "content-type": "image/webp",
      },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const sourceUrl = "https://media.tuan.chat/media/v1/files/542/30542/original";
    const request = new Request(`https://www.tuan.chat/webgal-asset-proxy?url=${encodeURIComponent(sourceUrl)}`, {
      headers: {
        "accept": "image/webp",
        "authorization": "Bearer local-token",
        "cookie": "satoken=session-token",
        "referer": "https://www.tuan.chat/rooms/1",
        "user-agent": "vitest",
      },
    });

    const response = await onRequest(createContext(request));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("avatar");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("fetch should have been called");
    }
    const [targetUrl, init] = firstCall;
    expect(String(targetUrl)).toBe(sourceUrl);
    expect(init).toBeDefined();
    if (!init) {
      throw new Error("fetch init should be provided");
    }
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer local-token");
    expect(headers.get("cookie")).toBe("satoken=session-token");
    expect(headers.get("referer")).toBe("https://www.tuan.chat/rooms/1");
  });

  it("webGAL 资源代理拒绝非团剧媒体域名，避免开放代理", async () => {
    const fetchMock = vi.fn<FetchHandler>();
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://www.tuan.chat/webgal-asset-proxy?url=https%3A%2F%2Fevil.example%2Fa.png");

    const response = await onRequest(createContext(request));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Asset URL is not allowed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("webGAL 派生媒体读取失败时会回退到 origin.tuan.chat 同路径源站", async () => {
    const fetchMock = vi.fn<FetchHandler>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(new Response("avatar-original", {
        headers: { "content-type": "image/webp" },
        status: 200,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const sourceUrl = "https://media.tuan.chat/media/v1/files/584/30584/image/medium.webp";
    const request = new Request(`https://www.tuan.chat/webgal-asset-proxy?url=${encodeURIComponent(sourceUrl)}`);

    const response = await onRequest(createContext(request));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("avatar-original");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe(sourceUrl);
    expect(fetchMock.mock.calls[1]![0]).toBe("https://origin.tuan.chat/media/v1/files/584/30584/image/medium.webp");
  });

  it("登录页事件会写入匿名独立访客指标", async () => {
    const writeDataPoint = vi.fn();
    const env = {
      TUANCHAT_ANALYTICS_FINGERPRINT_SALT: "test-fingerprint-salt",
      TUANCHAT_PRODUCT_ANALYTICS: { writeDataPoint },
    };
    const headers = {
      "cf-connecting-ip": "203.0.113.8",
      "origin": "https://tuan.chat",
      "user-agent": "vitest-browser",
    };

    const pageViewResponse = await onRequest(createContext(new Request(
      "https://tuan.chat/_analytics/login-page-view",
      { method: "POST", headers },
    ), env));
    const discoveryResponse = await onRequest(createContext(new Request(
      "https://tuan.chat/_analytics/login-easter-egg-discovered",
      { method: "POST", headers },
    ), env));

    expect(pageViewResponse.status).toBe(204);
    expect(discoveryResponse.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledTimes(2);
    const pageViewPoint = writeDataPoint.mock.calls[0]![0];
    const discoveryPoint = writeDataPoint.mock.calls[1]![0];
    expect(pageViewPoint.indexes[0]).toHaveLength(64);
    expect(discoveryPoint.indexes[0]).toBe(pageViewPoint.indexes[0]);
    expect(pageViewPoint.blobs).toEqual(["login_page_view", "production", "tuan.chat", "/login", "v1"]);
    expect(discoveryPoint.blobs).toEqual([
      "login_easter_egg_discovered",
      "production",
      "tuan.chat",
      "/login",
      "v1",
    ]);
    expect(discoveryPoint.doubles).toEqual([4]);
  });

  it("登录页事件拒绝跨站请求", async () => {
    const writeDataPoint = vi.fn();
    const response = await onRequest(createContext(new Request(
      "https://tuan.chat/_analytics/login-page-view",
      {
        method: "POST",
        headers: {
          "cf-connecting-ip": "203.0.113.8",
          "origin": "https://evil.example",
          "user-agent": "vitest-browser",
        },
      },
    ), {
      TUANCHAT_ANALYTICS_FINGERPRINT_SALT: "test-fingerprint-salt",
      TUANCHAT_PRODUCT_ANALYTICS: { writeDataPoint },
    }));

    expect(response.status).toBe(403);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
});
