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

  it("会在追加 token 时复用已有查询串", () => {
    expect(appendUrlQueryParam("wss://tuan.chat/ws?client=web", "token", "abc 123")).toBe(
      "wss://tuan.chat/ws?client=web&token=abc%20123",
    );
  });
});
