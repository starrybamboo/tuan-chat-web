import { beforeEach, describe, expect, it } from "vitest";

import {
  prefetchImageAssetUrl,
  resetImageAssetPrefetchForTests,
} from "./imageAssetPrefetch";

describe("prefetchImageAssetUrl", () => {
  beforeEach(() => {
    resetImageAssetPrefetchForTests();
  });

  it("保留传入的图片质量和资源 URL", async () => {
    const requestedUrls: string[] = [];

    const prefetched = await prefetchImageAssetUrl(" https://cdn.example.com/image/medium.webp ", {
      loadImage: async (url) => {
        requestedUrls.push(url);
      },
    });

    expect(prefetched).toBe(true);
    expect(requestedUrls).toEqual(["https://cdn.example.com/image/medium.webp"]);
  });

  it("预热失败时安全结束，不阻断房间加载", async () => {
    await expect(prefetchImageAssetUrl("/assets/scene.webp", {
      loadImage: async () => {
        throw new Error("预热失败");
      },
    })).resolves.toBe(false);
  });

  it("合并同一资源的并发预热请求", async () => {
    const requestedUrls: string[] = [];
    const loadImage = async (url: string) => {
      requestedUrls.push(url);
      await new Promise(resolve => setTimeout(resolve, 0));
    };

    const first = prefetchImageAssetUrl("/assets/scene.webp", { loadImage });
    const second = prefetchImageAssetUrl("/assets/scene.webp", { loadImage });
    await Promise.all([first, second]);

    expect(requestedUrls).toEqual(["/assets/scene.webp"]);
  });
});
