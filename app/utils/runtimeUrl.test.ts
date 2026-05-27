import { afterEach, describe, expect, it, vi } from "vitest";

import { appendUrlQueryParam, resolveRuntimeWebSocketBaseUrl } from "./runtimeUrl";

function stubWindowLocation(origin: string) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/chat/discover/material`,
      origin,
      protocol: new URL(origin).protocol,
    },
    isSecureContext: true,
  });
}

describe("resolveRuntimeWebSocketBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("会在 HTTPS 页面把不安全的 ws 地址回退到当前站点 WSS", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("ws://101.126.143.129/ws")).toBe("wss://tuan.chat/ws");
  });

  it("会把 https WebSocket 配置转成 wss", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("https://api.example.com/ws")).toBe("wss://api.example.com/ws");
  });

  it("会把 tuan.chat 托管域名之间的 WebSocket 配置归一成当前站点 WSS", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("wss://tuan.chat/ws")).toBe("wss://test.tuan.chat/ws");
  });

  it("会在本地 HTTP 开发页保留本机 WebSocket 地址", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveRuntimeWebSocketBaseUrl("ws://localhost:8090")).toBe("ws://localhost:8090");
  });

  it("会在本地 HTTP 开发页用 ws 回退到当前站点", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveRuntimeWebSocketBaseUrl(undefined)).toBe("ws://localhost:5177/ws");
  });

  it("会在追加 token 时复用已有查询串", () => {
    expect(appendUrlQueryParam("wss://tuan.chat/ws?client=web", "token", "abc 123")).toBe(
      "wss://tuan.chat/ws?client=web&token=abc%20123",
    );
  });
});
