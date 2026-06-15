import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calculateHoverPreviewSize,
  loadHoverPreviewSize,
} from "./imgWithHoverToScale";
import { resetMediaImageResolvedSrcCacheForTests } from "./mediaImage";

afterEach(() => {
  resetMediaImageResolvedSrcCacheForTests();
  vi.unstubAllGlobals();
});

describe("calculateHoverPreviewSize", () => {
  it("按图片比例计算悬停预览尺寸", () => {
    expect(calculateHoverPreviewSize({
      width: 0,
      height: 0,
      naturalWidth: 800,
      naturalHeight: 400,
    }, 0.25, 1000)).toEqual({
      width: 500,
      height: 250,
    });
  });

  it("图片尺寸不可用时保持正方形默认比例", () => {
    expect(calculateHoverPreviewSize({
      width: 0,
      height: 0,
      naturalWidth: 0,
      naturalHeight: 0,
    }, 0.2, 1000)).toEqual({
      width: 200,
      height: 200,
    });
  });
});

describe("loadHoverPreviewSize", () => {
  it("复用 MediaImage 的 original fallback，避免悬停预加载长期重复请求缺失派生图", async () => {
    const requestedUrls: string[] = [];

    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      width = 0;
      height = 0;
      private _src = "";

      set src(value: string) {
        this._src = value;
        requestedUrls.push(value);
        queueMicrotask(() => {
          if (value.includes("/image/medium.webp")) {
            this.onerror?.(new Error("404"));
            return;
          }
          this.naturalWidth = 1200;
          this.naturalHeight = 600;
          this.onload?.();
        });
      }

      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("Image", MockImage as never);

    await expect(
      loadHoverPreviewSize("/media/v1/files/045/45/image/medium.webp", 0.25, 1000),
    ).resolves.toEqual({
      width: 500,
      height: 250,
    });

    await expect(
      loadHoverPreviewSize("/media/v1/files/045/45/image/medium.webp", 0.25, 1000),
    ).resolves.toEqual({
      width: 500,
      height: 250,
    });

    expect(requestedUrls).toEqual([
      "http://localhost/media/v1/files/045/45/image/medium.webp",
      "http://localhost/media/v1/files/045/45/original",
      "http://localhost/media/v1/files/045/45/original",
    ]);
  });
});
