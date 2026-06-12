import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  rememberPersistentMediaImageDerivedAvailable,
  rememberPersistentMediaImageDerivedMissing,
  resetPersistentMediaImageCacheForTests,
  resolvePersistentMediaImageSrc,
  resolvePersistentMediaImageSrcSync,
  startPersistentMediaImageDerivativeProbe,
} from "./mediaPersistentImageCache";

const STORAGE_KEY = "tuanchat-media-image-derived-status-v1";

class FakeStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("mediaPersistentImageCache", () => {
  const imageUrl = "https://media.tuan.chat/media/v1/files/045/45/image/medium.webp";
  const imageHighUrl = "https://media.tuan.chat/media/v1/files/045/45/image/high.webp";
  const originalUrl = "https://media.tuan.chat/media/v1/files/045/45/original";
  let fakeStorage: FakeStorage;

  beforeEach(() => {
    fakeStorage = new FakeStorage();
    vi.stubGlobal("localStorage", fakeStorage);
    vi.stubGlobal("fetch", vi.fn());
    resetPersistentMediaImageCacheForTests();
  });

  afterEach(() => {
    resetPersistentMediaImageCacheForTests();
    vi.unstubAllGlobals();
  });

  it("未知派生图默认返回派生 URL，且不会主动 fetch 图片", async () => {
    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(imageUrl);
    await expect(resolvePersistentMediaImageSrc(imageUrl)).resolves.toBe(imageUrl);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("记录派生图缺失后，同一文件的派生 URL 会直接回退 original", () => {
    rememberPersistentMediaImageDerivedMissing(imageUrl);

    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(originalUrl);
    expect(resolvePersistentMediaImageSrcSync(imageHighUrl)).toBe(originalUrl);
  });

  it("记录派生图可用后会继续返回派生 URL", () => {
    rememberPersistentMediaImageDerivedMissing(imageUrl);
    rememberPersistentMediaImageDerivedAvailable(imageUrl);

    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(imageUrl);
  });

  it("会从 localStorage 同步恢复派生图缺失状态", () => {
    fakeStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      records: [
        {
          fileId: 45,
          status: "missing",
          updatedAt: 1,
        },
      ],
    }));

    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(originalUrl);
  });

  it("全局探测会在组件卸载之外记录派生图缺失，并复用同一文件的探测", async () => {
    const imageInstances: Array<{
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      constructor() {
        imageInstances.push(this);
      }

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          this.onerror?.();
        });
      }

      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("Image", MockImage as never);

    startPersistentMediaImageDerivativeProbe(imageUrl);
    startPersistentMediaImageDerivativeProbe(imageHighUrl);

    expect(imageInstances).toHaveLength(1);
    await vi.waitFor(() => {
      expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(originalUrl);
    });
  });

  it("全局探测加载成功时保持 unknown，避免把重定向到 original 的响应误记为 available", async () => {
    const imageInstances: Array<{
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      constructor() {
        imageInstances.push(this);
      }

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          this.onload?.();
        });
      }

      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("Image", MockImage as never);

    startPersistentMediaImageDerivativeProbe(imageUrl);

    expect(imageInstances).toHaveLength(1);
    await vi.waitFor(() => {
      expect(fakeStorage.getItem(STORAGE_KEY)).toBeNull();
    });
    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(imageUrl);
  });

  it("重置测试缓存时会清理内存和 localStorage", () => {
    rememberPersistentMediaImageDerivedMissing(imageUrl);

    resetPersistentMediaImageCacheForTests();

    expect(fakeStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(resolvePersistentMediaImageSrcSync(imageUrl)).toBe(imageUrl);
  });
});
