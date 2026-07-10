import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadMediaImageWithOriginalFallback } from "@/components/common/mediaImage";

import {
  loadPreviewSpriteImage,
  preloadPreviewSpriteImage,
  resetPreviewSpriteImageCacheForTests,
  setPreviewSpriteImageCacheLimitForTests,
} from "./previewSpriteImageCache";

vi.mock("@/components/common/mediaImage", () => ({
  loadMediaImageWithOriginalFallback: vi.fn(),
}));

const mockedLoadMediaImage = vi.mocked(loadMediaImageWithOriginalFallback);
const originalCreateImageBitmap = globalThis.createImageBitmap;

function createImage(width = 100, height = 80): HTMLImageElement {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  } as HTMLImageElement;
}

function mockBitmapFactory(closeCallbacks: Array<() => void> = []) {
  globalThis.createImageBitmap = vi.fn(async () => {
    const close = vi.fn();
    closeCallbacks.push(close);
    return { close } as unknown as ImageBitmap;
  }) as typeof createImageBitmap;
}

describe("previewSpriteImageCache", () => {
  beforeEach(() => {
    resetPreviewSpriteImageCacheForTests();
    mockedLoadMediaImage.mockReset();
    mockBitmapFactory();
  });

  afterEach(() => {
    resetPreviewSpriteImageCacheForTests();
    globalThis.createImageBitmap = originalCreateImageBitmap;
  });

  it("复用同一 URL 的进行中加载", async () => {
    let resolveImage!: (image: HTMLImageElement) => void;
    mockedLoadMediaImage.mockReturnValue(new Promise<HTMLImageElement>((resolve) => {
      resolveImage = resolve;
    }));

    const firstLoad = loadPreviewSpriteImage("https://example.test/a.png");
    const secondLoad = loadPreviewSpriteImage("https://example.test/a.png");

    expect(firstLoad).toBe(secondLoad);
    expect(mockedLoadMediaImage).toHaveBeenCalledTimes(1);

    resolveImage(createImage());
    await expect(firstLoad).resolves.toMatchObject({ image: expect.any(Object) });
  });

  it("限制缓存数量并释放被淘汰的 ImageBitmap", async () => {
    const closeCallbacks: Array<() => void> = [];
    mockBitmapFactory(closeCallbacks);
    setPreviewSpriteImageCacheLimitForTests(1);
    mockedLoadMediaImage
      .mockResolvedValueOnce(createImage(120, 90))
      .mockResolvedValueOnce(createImage(80, 80));

    await loadPreviewSpriteImage("https://example.test/a.png");
    await loadPreviewSpriteImage("https://example.test/b.png");

    expect(mockedLoadMediaImage).toHaveBeenCalledTimes(2);
    expect(closeCallbacks[0]).toHaveBeenCalledTimes(1);
  });

  it("预热失败不会向调用方抛出", async () => {
    mockedLoadMediaImage.mockRejectedValueOnce(new Error("load failed"));

    expect(() => preloadPreviewSpriteImage("https://example.test/missing.png")).not.toThrow();
    await Promise.resolve();
  });
});
