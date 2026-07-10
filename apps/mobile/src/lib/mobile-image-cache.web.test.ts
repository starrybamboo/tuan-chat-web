import { afterEach, describe, expect, it, vi } from "vitest";

const IMAGE_URL = "https://media.tuan.chat/media/v1/files/951/4951/image/low.webp";
const ORIGINAL_URL = "https://media.tuan.chat/media/v1/files/951/4951/original";
const OBJECT_URL = "blob:http://localhost:8082/avatar-cache";
const PROXY_URL = `/__tuanchat_mobile_media_proxy__?url=${encodeURIComponent(IMAGE_URL)}`;
const ORIGINAL_PROXY_URL = `/__tuanchat_mobile_media_proxy__?url=${encodeURIComponent(ORIGINAL_URL)}`;

async function importWebImageCache() {
  vi.resetModules();
  vi.doMock("react-native", () => ({
    Platform: {
      OS: "web",
    },
  }));
  vi.doMock("expo-file-system", () => ({
    Directory: class MockDirectory {},
    File: class MockFile {},
    Paths: {
      document: "file:///unused",
    },
  }));
  return await import("./mobile-image-cache");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("react-native");
  vi.doUnmock("expo-file-system");
});

describe("mobile image cache on web", () => {
  it("通过同源媒体代理缓存远程图片，避免浏览器直接跨域 fetch", async () => {
    const {
      getCachedImageUriSync,
      isAlreadyCached,
      prefetchImage,
      prefetchImages,
      resetCache,
      resolveCachedImageUri,
    } = await importWebImageCache();
    const cacheStore = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (request: Request) => cacheStore.get(request.url) ?? undefined),
      put: vi.fn(async (request: Request, response: Response) => {
        cacheStore.set(request.url, response);
      }),
    };
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response("image", {
      headers: { "content-type": "image/webp" },
      status: 200,
    }));
    const originalUrl = globalThis.URL;
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("caches", {
      open: vi.fn(async () => cache),
    });
    vi.stubGlobal("URL", Object.assign(originalUrl, {
      createObjectURL: vi.fn(() => OBJECT_URL),
      revokeObjectURL: vi.fn(),
    }));

    resetCache();

    expect(getCachedImageUriSync(IMAGE_URL)).toBeNull();
    await expect(resolveCachedImageUri(IMAGE_URL)).resolves.toBe(OBJECT_URL);
    expect(getCachedImageUriSync(IMAGE_URL)).toBe(OBJECT_URL);
    await expect(prefetchImage(IMAGE_URL)).resolves.toBe(true);
    await expect(prefetchImages([IMAGE_URL])).resolves.toBeUndefined();
    expect(isAlreadyCached(IMAGE_URL)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchedUrl = fetchSpy.mock.calls[0]?.[0];
    expect(fetchedUrl).toBe(PROXY_URL);
    expect(fetchedUrl).not.toBe(IMAGE_URL);
  });

  it("CacheStorage 不可用时也只把同源代理 URL 交给图片组件", async () => {
    const {
      getCachedImageUriSync,
      resetCache,
      resolveCachedImageUri,
    } = await importWebImageCache();

    vi.stubGlobal("caches", undefined);

    resetCache();

    expect(getCachedImageUriSync(IMAGE_URL)).toBeNull();
    await expect(resolveCachedImageUri(IMAGE_URL)).resolves.toBe(PROXY_URL);
  });

  it("代理拉取失败时不会回退到原始跨域 URL", async () => {
    const {
      resetCache,
      resolveCachedImageUri,
    } = await importWebImageCache();
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(),
    };
    const fetchSpy = vi.fn(async () => new Response("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("caches", {
      open: vi.fn(async () => cache),
    });

    resetCache();

    await expect(resolveCachedImageUri(IMAGE_URL)).resolves.toBe(ORIGINAL_PROXY_URL);
    expect(fetchSpy).toHaveBeenNthCalledWith(1, PROXY_URL, { cache: "force-cache" });
    expect(fetchSpy).toHaveBeenNthCalledWith(2, ORIGINAL_PROXY_URL, { cache: "force-cache" });
    expect(fetchSpy).not.toHaveBeenCalledWith(IMAGE_URL, expect.anything());
  });

  it("临时代理失败时不切换 original，避免错误缓存派生图缺失", async () => {
    const {
      resetCache,
      resolveCachedImageUri,
    } = await importWebImageCache();
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(),
    };
    const fetchSpy = vi.fn(async () => new Response("upstream error", { status: 502 }));
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("caches", {
      open: vi.fn(async () => cache),
    });

    resetCache();

    await expect(resolveCachedImageUri(IMAGE_URL)).resolves.toBe(PROXY_URL);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(PROXY_URL, { cache: "force-cache" });
  });
});
