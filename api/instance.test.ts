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

  it("会把运行时同源 API 绝对地址归一成相对路径", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("https://tuan.chat/api")).toBe("/api");
  });

  it("会保留跨源 API 绝对地址", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("https://test.tuan.chat/api")).toBe("https://test.tuan.chat/api");
  });

  it("会在本地 HTTP 开发页保留本机后端地址", () => {
    stubWindowLocation("http://localhost:5177", true);

    expect(resolveApiBaseUrl("http://localhost:8081")).toBe("http://localhost:8081");
  });

  it("会在 HTTPS 页面把不安全的 API 地址回退到当前站点", () => {
    stubWindowLocation("https://tuan.chat");

    expect(resolveApiBaseUrl("http://101.126.143.129/api")).toBe("/api");
  });
});
