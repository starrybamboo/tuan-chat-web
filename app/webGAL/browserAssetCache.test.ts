import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  backfillMirroredWebgalAssetCache,
  fetchObservedWebgalAssetBlob,
  getMirroredWebgalAssetBlob,
  hasObservedWebgalAsset,
  markObservedWebgalAsset,
  primeWebgalAssetCache,
  resetWebgalAssetCacheForTests,
} from "./browserAssetCache";

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

describe("browserAssetCache", () => {
  const testUrl = "https://oss.example.com/avatar.webp";
  let fakeCache: FakeCache;
  let fetchSpy: any;

  beforeEach(() => {
    fakeCache = new FakeCache();
    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue(fakeCache),
    };
    fetchSpy = vi.spyOn(globalThis, "fetch");
    resetWebgalAssetCacheForTests();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    resetWebgalAssetCacheForTests();
    delete (globalThis as any).caches;
  });

  it("预热时会把资源标记为已见并写入镜像缓存", async () => {
    fetchSpy.mockResolvedValue(new Response("avatar-binary", {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    }));

    await primeWebgalAssetCache(testUrl);

    expect(hasObservedWebgalAsset(testUrl)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(testUrl, { cache: "force-cache" });
    const mirrored = await getMirroredWebgalAssetBlob(testUrl);
    expect(mirrored).not.toBeNull();
    expect(await mirrored!.text()).toBe("avatar-binary");
  });

  it("已见资源会优先尝试从浏览器缓存回读并同步写入镜像缓存", async () => {
    markObservedWebgalAsset(testUrl);
    fetchSpy.mockResolvedValue(new Response("sprite-binary", {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    }));

    const blob = await fetchObservedWebgalAssetBlob(testUrl);

    expect(blob).not.toBeNull();
    expect(await blob!.text()).toBe("sprite-binary");
    const mirrored = await getMirroredWebgalAssetBlob(testUrl);
    expect(mirrored).not.toBeNull();
    expect(await mirrored!.text()).toBe("sprite-binary");
  });

  it("未标记为已见的资源不会贸然走浏览器缓存回读", async () => {
    const blob = await fetchObservedWebgalAssetBlob(testUrl);

    expect(blob).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("terre 直拉成功后的异步回填会写入镜像缓存，但不会伪造已见标记", async () => {
    fetchSpy.mockResolvedValue(new Response("backfill-binary", {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    }));

    await backfillMirroredWebgalAssetCache(testUrl);

    expect(hasObservedWebgalAsset(testUrl)).toBe(false);
    expect(fetchSpy).toHaveBeenCalledWith(testUrl, { cache: "force-cache" });
    const mirrored = await getMirroredWebgalAssetBlob(testUrl);
    expect(mirrored).not.toBeNull();
    expect(await mirrored!.text()).toBe("backfill-binary");
  });
});
