import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadMediaImageWithOriginalFallback,
  resetMediaImageResolvedSrcCacheForTests,
  resolveMediaOriginalFallbackSrc,
} from "./mediaImage";

afterEach(() => {
  resetMediaImageResolvedSrcCacheForTests();
  vi.unstubAllGlobals();
});

describe("resolveMediaOriginalFallbackSrc", () => {
  it("会把媒体派生图 URL 回退到 original", () => {
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/low.webp"))
      .toBe("http://localhost/media/v1/files/045/45/original");
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/medium.webp"))
      .toBe("http://localhost/media/v1/files/045/45/original");
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/image/high.webp"))
      .toBe("http://localhost/media/v1/files/045/45/original");
  });

  it("original 和非媒体 URL 不生成回退地址", () => {
    expect(resolveMediaOriginalFallbackSrc("/media/v1/files/045/45/original")).toBeUndefined();
    expect(resolveMediaOriginalFallbackSrc("https://example.com/image.png")).toBeUndefined();
    expect(resolveMediaOriginalFallbackSrc("")).toBeUndefined();
  });
});

describe("loadMediaImageWithOriginalFallback", () => {
  it("派生图失败时会回退 original，并记住后续直接走 original", async () => {
    const requestedUrls: string[] = [];

    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      private _src = "";

      set src(value: string) {
        this._src = value;
        requestedUrls.push(value);
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

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("Image", MockImage as never);

    await expect(
      loadMediaImageWithOriginalFallback("/media/v1/files/045/45/image/medium.webp"),
    ).resolves.toMatchObject({
      src: "http://localhost/media/v1/files/045/45/original",
      naturalWidth: 256,
      naturalHeight: 256,
    });

    await expect(
      loadMediaImageWithOriginalFallback("/media/v1/files/045/45/image/medium.webp"),
    ).resolves.toMatchObject({
      src: "http://localhost/media/v1/files/045/45/original",
      naturalWidth: 256,
      naturalHeight: 256,
    });

    expect(requestedUrls).toEqual([
      "http://localhost/media/v1/files/045/45/image/medium.webp",
      "http://localhost/media/v1/files/045/45/original",
      "http://localhost/media/v1/files/045/45/original",
    ]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("派生图成功时会继续直接使用派生图，不额外请求 original", async () => {
    const requestedUrls: string[] = [];
    const requestedSrc = "/media/v1/files/045/45/image/medium.webp";

    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      private _src = "";

      set src(value: string) {
        this._src = value;
        requestedUrls.push(value);
        queueMicrotask(() => {
          this.naturalWidth = 256;
          this.naturalHeight = 256;
          this.onload?.();
        });
      }

      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("Image", MockImage as never);

    await expect(loadMediaImageWithOriginalFallback(requestedSrc)).resolves.toMatchObject({
      src: "http://localhost/media/v1/files/045/45/image/medium.webp",
      naturalWidth: 256,
      naturalHeight: 256,
    });

    await expect(loadMediaImageWithOriginalFallback(requestedSrc)).resolves.toMatchObject({
      src: "http://localhost/media/v1/files/045/45/image/medium.webp",
      naturalWidth: 256,
      naturalHeight: 256,
    });

    expect(requestedUrls).toEqual([
      "http://localhost/media/v1/files/045/45/image/medium.webp",
      "http://localhost/media/v1/files/045/45/image/medium.webp",
    ]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("不会把普通图片预加载强制成跨域请求", async () => {
    const images: MockImage[] = [];

    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      private _src = "";

      constructor() {
        images.push(this);
      }

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
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

    await expect(loadMediaImageWithOriginalFallback("/media/v1/files/045/45/image/medium.webp"))
      .resolves.toMatchObject({
        src: "http://localhost/media/v1/files/045/45/image/medium.webp",
      });

    expect(images).toHaveLength(1);
    expect(images[0]?.crossOrigin).toBe("");
  });
});
