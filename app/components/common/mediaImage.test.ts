import { describe, expect, it } from "vitest";

import { resolveMediaOriginalFallbackSrc } from "./mediaImage";

describe("resolveMediaOriginalFallbackSrc", () => {
  it("会把媒体派生图 URL 回退到 original", () => {
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/low.webp"))
      .toBe("/media/v1/files/045/45/original");
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/medium.webp"))
      .toBe("/media/v1/files/045/45/original");
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/high.webp"))
      .toBe("/media/v1/files/045/45/original");
  });

  it("original 和非媒体 URL 不生成回退地址", () => {
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/original")).toBeUndefined();
    expect(resolveMediaOriginalFallbackSrc("https://example.com/image.png")).toBeUndefined();
    expect(resolveMediaOriginalFallbackSrc("")).toBeUndefined();
  });
});
