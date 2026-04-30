import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveApiBaseUrl } from "./instance";

function stubWindowLocation(origin: string) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/chat/discover/material`,
      origin,
    },
    isSecureContext: true,
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
});
