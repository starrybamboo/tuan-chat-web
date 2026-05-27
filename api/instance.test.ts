import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveApiBaseUrl } from "./instance";

function stubWindowLocation(origin: string, isSecureContext = true) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/chat/discover/material`,
      origin,
      protocol: new URL(origin).protocol,
    },
    isSecureContext,
  });
}

describe("resolveApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("会把运行时同源 API 绝对地址归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("https://tuan.chat/api")).toBe("https://api.tuan.chat/api");
  });

  it("会把 tuan.chat 托管域名之间的 API 配置归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("https://test.tuan.chat/api")).toBe("https://api.tuan.chat/api");
  });

  it("会把线上同源 API 相对路径归一到直连后端域名", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveApiBaseUrl("/api")).toBe("https://api.tuan.chat/api");
  });

  it("会在环境变量缺失时把线上 API 归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl(undefined)).toBe("https://api.tuan.chat/api");
  });

  it("会保留外部 API 绝对地址", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("https://api.example.com/api")).toBe("https://api.example.com/api");
  });

  it("会在本地 HTTP 开发页保留本机后端地址", () => {
    stubWindowLocation("http://localhost:5177", true);

    expect(resolveApiBaseUrl("http://localhost:8081")).toBe("http://localhost:8081");
  });

  it("会在线上 HTTPS 页面把不安全的旧源站 API 地址归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("http://101.126.143.129/api")).toBe("https://api.tuan.chat/api");
  });
});
