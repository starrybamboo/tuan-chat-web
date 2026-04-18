import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUploadUrlMock } = vi.hoisted(() => ({
  getUploadUrlMock: vi.fn(),
}));

vi.mock("api/instance", () => ({
  tuanchat: {
    ossController: {
      getUploadUrl: getUploadUrlMock,
    },
  },
}));

vi.mock("@blocksuite/sync", () => {
  class MemoryIndexedDBBlobSource {
    readonly readonly = false;
    readonly _cache = new Map<string, Blob>();

    constructor(readonly name: string) {}

    async get(key: string) {
      return this._cache.get(key) ?? null;
    }

    async set(key: string, value: Blob) {
      this._cache.set(key, value);
      return key;
    }

    async delete(key: string) {
      this._cache.delete(key);
    }

    async list() {
      return Array.from(this._cache.keys());
    }
  }

  return {
    IndexedDBBlobSource: MemoryIndexedDBBlobSource,
  };
});

import {
  BlocksuiteRemoteImageBlobSource,
  buildBlocksuiteRemoteImageFileName,
} from "../space/runtime/blocksuiteRemoteImageBlobSource";

describe("blocksuiteRemoteImageBlobSource", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("图片写入后会先缓存本地，再异步上传到 MinIO", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    getUploadUrlMock.mockResolvedValue({
      success: true,
      data: {
        uploadUrl: "https://upload.example/blocksuite-image",
        downloadUrl: "https://download.example/blocksuite-image",
      },
    });

    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });
    let latestState: any;
    const subscription = source.blobState$("image-key==")?.subscribe((state) => {
      latestState = state;
    });

    const imageBlob = new Blob(["png"], { type: "image/png" });
    const key = await source.set("image-key==", imageBlob);

    expect(key).toBe("image-key==");
    expect(await (await source.get("image-key=="))?.text()).toBe("png");
    expect(getUploadUrlMock).toHaveBeenCalledWith({
      fileName: buildBlocksuiteRemoteImageFileName("image-key=="),
      scene: 1,
      dedupCheck: true,
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://upload.example/blocksuite-image",
        expect.objectContaining({
          method: "PUT",
          body: imageBlob,
        }),
      );
      expect(latestState?.uploading).toBe(false);
      expect(latestState?.needUpload).toBe(false);
    });

    subscription?.unsubscribe();
  });

  it("本地 miss 时会回源下载图片并回填本地缓存", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(new Response("remote-image", {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    }));
    getUploadUrlMock.mockResolvedValue({
      success: true,
      data: {
        uploadUrl: "",
        downloadUrl: "https://download.example/blocksuite-image",
      },
    });

    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });

    const firstBlob = await source.get("remote-key==");
    const secondBlob = await source.get("remote-key==");

    expect(await firstBlob?.text()).toBe("remote-image");
    expect(await secondBlob?.text()).toBe("remote-image");
    expect(firstBlob?.type).toBe("image/png");
    expect(getUploadUrlMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("非图片 blob 只走本地缓存，不触发 MinIO 上传", async () => {
    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });

    await source.set("text-key", new Blob(["plain-text"], { type: "text/plain" }));

    expect(getUploadUrlMock).not.toHaveBeenCalled();
    expect(await (await source.get("text-key"))?.text()).toBe("plain-text");
  });

  it("上传失败后会标记 needUpload，并支持手动重试", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    getUploadUrlMock.mockResolvedValue({
      success: true,
      data: {
        uploadUrl: "https://upload.example/retry-image",
        downloadUrl: "https://download.example/retry-image",
      },
    });

    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });
    let latestState: any;
    const subscription = source.blobState$("retry-key==")?.subscribe((state) => {
      latestState = state;
    });

    await source.set("retry-key==", new Blob(["retry"], { type: "image/png" }));

    await vi.waitFor(() => {
      expect(latestState?.needUpload).toBe(true);
      expect(latestState?.errorMessage).toContain("图片上传失败");
    });

    await expect(source.upload("retry-key==")).resolves.toBe(true);
    expect(getUploadUrlMock).toHaveBeenCalledTimes(2);
    expect(latestState?.needUpload).toBe(false);
    expect(latestState?.errorMessage).toBeNull();

    subscription?.unsubscribe();
  });
});
