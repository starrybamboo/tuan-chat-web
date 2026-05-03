import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BlocksuiteRemoteImageBlobSource,
  buildBlocksuiteRemoteImageFileName,
} from "../space/runtime/blocksuiteRemoteImageBlobSource";

const { requestMock, uploadMediaFileMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  uploadMediaFileMock: vi.fn(),
}));

vi.mock("api/instance", () => ({
  tuanchat: {
    request: {
      request: requestMock,
    },
  },
}));

vi.mock("@/utils/mediaUpload", () => ({
  uploadMediaFile: uploadMediaFileMock,
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

describe("blocksuiteRemoteImageBlobSource", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("图片写入后会先缓存本地，再异步上传到媒体服务并绑定远程索引", async () => {
    uploadMediaFileMock.mockResolvedValue({
      fileId: 42,
      mediaType: "image",
      uploadRequired: true,
    });
    requestMock.mockResolvedValue({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        status: "ready",
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

    await vi.waitFor(() => {
      expect(uploadMediaFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: buildBlocksuiteRemoteImageFileName("image-key==", "image/png"),
          type: "image/png",
        }),
        { scene: 1 },
      );
      expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
        method: "POST",
        url: "/media/aliases",
        body: {
          namespace: "space:test:remote-image",
          aliasKey: "image-key==",
          fileId: 42,
          expectedMediaType: "image",
        },
      }));
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
    requestMock.mockResolvedValue({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        status: "ready",
      },
    });

    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });

    const firstBlob = await source.get("remote-key==");
    const secondBlob = await source.get("remote-key==");

    expect(await firstBlob?.text()).toBe("remote-image");
    expect(await secondBlob?.text()).toBe("remote-image");
    expect(firstBlob?.type).toBe("image/png");
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      url: "/media/aliases",
      query: {
        namespace: "space:test:remote-image",
        aliasKey: "remote-key==",
      },
    }));
    expect(fetchMock).toHaveBeenCalledWith("https://tuan.chat/media/v1/files/042/42/original");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("非图片 blob 只走本地缓存，不触发媒体服务上传", async () => {
    const source = new BlocksuiteRemoteImageBlobSource({ dbPrefix: "space:test" });

    await source.set("text-key", new Blob(["plain-text"], { type: "text/plain" }));

    expect(uploadMediaFileMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
    expect(await (await source.get("text-key"))?.text()).toBe("plain-text");
  });

  it("上传失败后会标记 needUpload，并支持手动重试", async () => {
    uploadMediaFileMock.mockRejectedValueOnce(new Error("network"));
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 42,
      mediaType: "image",
      uploadRequired: true,
    });
    requestMock.mockResolvedValue({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        status: "ready",
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
    expect(uploadMediaFileMock).toHaveBeenCalledTimes(2);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(latestState?.needUpload).toBe(false);
    expect(latestState?.errorMessage).toBeNull();

    subscription?.unsubscribe();
  });
});
