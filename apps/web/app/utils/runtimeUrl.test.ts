import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appendUrlQueryParam,
  resolveRuntimeMediaBaseUrl,
  resolveRuntimeTuanChatServiceBaseUrl,
  resolveRuntimeWebSocketBaseUrl,
} from "./runtimeUrl";

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

  it("会在线上 HTTPS 页面把不安全的 ws 地址归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("ws://101.126.143.129/ws")).toBe("wss://api.tuan.chat/ws");
  });

  it("会把 https WebSocket 配置转成 wss", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("https://api.example.com/ws")).toBe("wss://api.example.com/ws");
  });

  it("会把 tuan.chat 托管域名之间的 WebSocket 配置归一到直连后端域名", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("wss://tuan.chat/ws")).toBe("wss://api.tuan.chat/ws");
  });

  it("会把线上同源 WebSocket 相对路径归一到直连后端域名", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl("/ws")).toBe("wss://api.tuan.chat/ws");
  });

  it("会在环境变量缺失时把线上 WebSocket 归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeWebSocketBaseUrl(undefined)).toBe("wss://api.tuan.chat/ws");
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

describe("resolveRuntimeMediaBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("会把线上媒体基址从 Pages 域名归一到直连后端域名", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveRuntimeMediaBaseUrl("https://tuan.chat/", "https://tuan.chat")).toBe("https://api.tuan.chat");
  });

  it("会在环境变量为空时把默认媒体基址归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeMediaBaseUrl("", "https://tuan.chat")).toBe("https://api.tuan.chat");
  });
});

describe("resolveRuntimeTuanChatServiceBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("会把线上同源服务路径归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveRuntimeTuanChatServiceBaseUrl("/tts", "/tts", "http://localhost:9000")).toBe(
      "https://api.tuan.chat/tts",
    );
  });

  it("会在本地开发页保留本地服务地址", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveRuntimeTuanChatServiceBaseUrl(undefined, "/tts", "http://localhost:9000")).toBe(
      "http://localhost:9000",
    );
  });
});
