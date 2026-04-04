import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetFfmpegAssetCacheForTests,
  resolvePersistentFfmpegAssetBlobUrl,
} from "./ffmpegAssetCache";

class FakeCache {
  private readonly store = new Map<string, Response>();

  async match(request: string): Promise<Response | undefined> {
    const response = this.store.get(request);
    return response?.clone();
  }

  async put(request: string, response: Response): Promise<void> {
    this.store.set(request, response.clone());
  }
}

describe("ffmpegAssetCache", () => {
  const assetUrl = "https://test.tuan.chat/assets/ffmpeg-core-demo.wasm";
  let fakeCache: FakeCache;
  let fetchSpy: any;
  let createObjectUrlSpy: ReturnType<typeof vi.fn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.fn>;
  let blobCounter = 0;

  beforeEach(() => {
    fakeCache = new FakeCache();
    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue(fakeCache),
    };
    fetchSpy = vi.spyOn(globalThis, "fetch");

    blobCounter = 0;
    createObjectUrlSpy = vi.fn(() => `blob:ffmpeg-${++blobCounter}`);
    revokeObjectUrlSpy = vi.fn();
    (URL as any).createObjectURL = createObjectUrlSpy;
    (URL as any).revokeObjectURL = revokeObjectUrlSpy;

    resetFfmpegAssetCacheForTests();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    resetFfmpegAssetCacheForTests();
    delete (globalThis as any).caches;
    vi.restoreAllMocks();
  });

  it("首次解析时会拉取资源并写入持久缓存", async () => {
    fetchSpy.mockResolvedValue(new Response(new Uint8Array([0x00, 0x61, 0x73, 0x6D]), {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
      },
    }));

    const resolvedUrl = await resolvePersistentFfmpegAssetBlobUrl(assetUrl, "application/wasm", 5000);

    expect(resolvedUrl).toBe("blob:ffmpeg-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(assetUrl, {
      cache: "force-cache",
      signal: expect.any(AbortSignal),
    });
    const cached = await fakeCache.match(assetUrl);
    expect(cached).toBeDefined();
    expect(await cached!.arrayBuffer()).toEqual(new Uint8Array([0x00, 0x61, 0x73, 0x6D]).buffer);
  });

  it("清掉进程内状态后仍会优先命中持久缓存", async () => {
    fetchSpy.mockResolvedValue(new Response(new Uint8Array([0x00, 0x61, 0x73, 0x6D]), {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
      },
    }));

    const firstUrl = await resolvePersistentFfmpegAssetBlobUrl(assetUrl, "application/wasm", 5000);
    expect(firstUrl).toBe("blob:ffmpeg-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resetFfmpegAssetCacheForTests();

    const secondUrl = await resolvePersistentFfmpegAssetBlobUrl(assetUrl, "application/wasm", 5000);
    expect(secondUrl).toBe("blob:ffmpeg-2");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("同一轮并发请求会复用同一个下载过程", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    fetchSpy.mockImplementation(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));

    const firstPromise = resolvePersistentFfmpegAssetBlobUrl(assetUrl, "application/wasm", 5000);
    const secondPromise = resolvePersistentFfmpegAssetBlobUrl(assetUrl, "application/wasm", 5000);

    await new Promise(resolve => setTimeout(resolve, 0));
    resolveFetch?.(new Response(new Uint8Array([0x00, 0x61, 0x73, 0x6D]), {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
      },
    }));

    await expect(firstPromise).resolves.toBe("blob:ffmpeg-1");
    await expect(secondPromise).resolves.toBe("blob:ffmpeg-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
