import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMediaImageWithOriginalFallback, resolveMediaOriginalFallbackSrc } from "./mediaImage";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("loadMediaImageWithOriginalFallback", () => {
  it("派生图失败时会回退 original 再加载", async () => {
    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      private _src = "";

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          if (value.includes("/image/medium.webp")) {
            this.onerror?.(new Error("404"));
            return;
          }
          this.naturalWidth = 256;
          this.naturalHeight = 256;
          this.onload?.();
        });
      }

      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("Image", MockImage as never);

    await expect(
      loadMediaImageWithOriginalFallback("/media/v1/files/045/45/image/medium.webp"),
    ).resolves.toMatchObject({
      src: "/media/v1/files/045/45/original",
      naturalWidth: 256,
      naturalHeight: 256,
    });
  });
});
