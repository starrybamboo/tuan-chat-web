import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "./_middleware";

function createContext(request: Request) {
  return {
    env: {},
    next: vi.fn(async () => new Response("next", { status: 200 })),
    request,
  };
}

describe("cloudflare Pages middleware", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("webGAL 资源代理在生产环境直接读取团剧媒体，不转发到后端 API", async () => {
    const fetchMock = vi.fn(async () => new Response("avatar", {
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
    const [targetUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(targetUrl).toBe(sourceUrl);
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer local-token");
    expect(headers.get("cookie")).toBe("satoken=session-token");
    expect(headers.get("referer")).toBe("https://www.tuan.chat/rooms/1");
  });

  it("webGAL 资源代理拒绝非团剧媒体域名，避免开放代理", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://www.tuan.chat/webgal-asset-proxy?url=https%3A%2F%2Fevil.example%2Fa.png");

    const response = await onRequest(createContext(request));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Asset URL is not allowed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("webGAL 派生媒体读取失败时会回退到 origin.tuan.chat 同路径源站", async () => {
    const fetchMock = vi.fn()
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
});
