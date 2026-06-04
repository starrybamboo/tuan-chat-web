import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "./fileOperator";

const assetsControllerReadAssetsMock = vi.fn<() => Promise<{
  readDirPath: string;
  dirPath: string;
  dirInfo: never[];
}>>().mockResolvedValue({
  readDirPath: "",
  dirPath: "",
  dirInfo: [],
});
const assetsControllerUploadMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

vi.mock("./index", () => ({
  getTerreApis: vi.fn<() => {
    assetsControllerReadAssets: typeof assetsControllerReadAssetsMock;
    assetsControllerUpload: typeof assetsControllerUploadMock;
  }>(() => ({
    assetsControllerReadAssets: assetsControllerReadAssetsMock,
    assetsControllerUpload: assetsControllerUploadMock,
  })),
}));

vi.mock("./browserAssetCache", () => ({
  fetchObservedWebgalAssetBlob: vi.fn<() => Promise<Blob | null>>().mockResolvedValue(null),
  getMirroredWebgalAssetBlob: vi.fn<() => Promise<Blob | null>>().mockResolvedValue(null),
  mirrorWebgalAssetBlob: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

describe("fileOperator.uploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assetsControllerReadAssetsMock.mockResolvedValue({
      readDirPath: "",
      dirPath: "",
      dirInfo: [],
    });
    assetsControllerUploadMock.mockResolvedValue(undefined);
  });

  it("WebGAL render 上传远程资源时由团剧网页端拉取 Blob，不调用 Terre 后端直拉", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Blob(["avatar"], {
      type: "image/webp",
    }), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    }));

    await expect(uploadFile(
      "https://oss.example.com/avatar/sprite.webp",
      "games/realtime_1/game/figure",
      "sprite.webp",
    )).resolves.toBe("sprite.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://oss.example.com/avatar/sprite.webp",
      { cache: "force-cache" },
    );
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("网页端直接 fetch 失败时会回退到团剧 WebGAL 资源代理", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(new Blob(["avatar"], {
        type: "image/webp",
      }), { status: 200 }));

    await expect(uploadFile(
      "https://oss.example.com/avatar/room-cover.webp",
      "games/realtime_1/game/background",
      "room-cover.webp",
    )).resolves.toBe("room-cover.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "https://oss.example.com/avatar/room-cover.webp",
      { cache: "force-cache" },
    );
    const proxyUrl = String(fetchSpy.mock.calls[1][0]);
    expect(proxyUrl).toContain("/api/webgal-asset-proxy?url=");
    expect(decodeURIComponent(proxyUrl)).toContain("https://oss.example.com/avatar/room-cover.webp");
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("网页端直接 fetch 返回非 2xx 时会回退到团剧 WebGAL 资源代理", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Forbidden", { status: 403 }))
      .mockResolvedValueOnce(new Response(new Blob(["avatar"], {
        type: "image/webp",
      }), { status: 200 }));

    await expect(uploadFile(
      "https://oss.example.com/media/v1/files/001/1001/image/medium.webp",
      "games/realtime_1/game/figure/role_1",
      "sprite_7.webp",
    )).resolves.toBe("sprite_7.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const proxyUrl = String(fetchSpy.mock.calls[1][0]);
    expect(proxyUrl).toContain("/api/webgal-asset-proxy?url=");
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("media.tuan.chat 资源会直接走团剧 WebGAL 资源代理，避免浏览器 CORS 失败噪音", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(new Blob(["avatar"], {
        type: "image/webp",
      }), { status: 200 }));

    await expect(uploadFile(
      "https://media.tuan.chat/media/v1/files/001/1001/image/medium.webp",
      "games/realtime_1/game/background",
      "room-cover.webp",
    )).resolves.toBe("room-cover.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const proxyUrl = String(fetchSpy.mock.calls[0][0]);
    expect(proxyUrl).toContain("/api/webgal-asset-proxy?url=");
    expect(decodeURIComponent(proxyUrl)).toContain("https://media.tuan.chat/media/v1/files/001/1001/image/medium.webp");
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("media.tuan.chat 派生图代理失败时会回退到 original 源", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Not Found", { status: 404, statusText: "Not Found" }))
      .mockResolvedValueOnce(new Response(new Blob(["avatar-original"], {
        type: "image/webp",
      }), { status: 200 }));

    await expect(uploadFile(
      "https://media.tuan.chat/media/v1/files/479/30479/image/medium.webp",
      "games/realtime_1/game/background",
      "room-cover.webp",
    )).resolves.toBe("room-cover.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const firstProxyUrl = String(fetchSpy.mock.calls[0][0]);
    const secondProxyUrl = String(fetchSpy.mock.calls[1][0]);
    expect(firstProxyUrl).toContain("/api/webgal-asset-proxy?url=");
    expect(secondProxyUrl).toContain("/api/webgal-asset-proxy?url=");
    expect(decodeURIComponent(firstProxyUrl)).toContain("https://media.tuan.chat/media/v1/files/479/30479/image/medium.webp");
    expect(decodeURIComponent(secondProxyUrl)).toContain("https://media.tuan.chat/media/v1/files/479/30479/original");
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });
});
