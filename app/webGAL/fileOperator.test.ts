import { beforeEach, describe, expect, it, vi } from "vitest";

import { backfillMirroredWebgalAssetCache } from "./browserAssetCache";
import { uploadFile } from "./fileOperator";

const assetsControllerReadAssetsMock = vi.fn().mockResolvedValue({
  readDirPath: "",
  dirPath: "",
  dirInfo: [],
});
const assetsControllerUploadMock = vi.fn().mockResolvedValue(undefined);

vi.mock("./index", () => ({
  getTerreApis: vi.fn(() => ({
    assetsControllerReadAssets: assetsControllerReadAssetsMock,
    assetsControllerUpload: assetsControllerUploadMock,
  })),
}));

vi.mock("./browserAssetCache", () => ({
  backfillMirroredWebgalAssetCache: vi.fn().mockResolvedValue(undefined),
  fetchObservedWebgalAssetBlob: vi.fn().mockResolvedValue(null),
  getMirroredWebgalAssetBlob: vi.fn().mockResolvedValue(null),
  mirrorWebgalAssetBlob: vi.fn().mockResolvedValue(undefined),
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

  it("uploadByUrl 成功后会异步回填前端镜像缓存", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      fileName: "sprite.webp",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }));

    await expect(uploadFile(
      "https://oss.example.com/avatar/sprite.webp",
      "games/realtime_1/game/figure",
      "sprite.webp",
    )).resolves.toBe("sprite.webp");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/assets\/uploadByUrl$/),
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(backfillMirroredWebgalAssetCache).toHaveBeenCalledWith("https://oss.example.com/avatar/sprite.webp");

    fetchSpy.mockRestore();
  });

  it("uploadByUrl 返回 500 时会回退到浏览器上传流程", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Internal server error", { status: 500 }))
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
      expect.stringMatching(/\/api\/assets\/uploadByUrl$/),
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://oss.example.com/avatar/room-cover.webp",
      { cache: "force-cache" },
    );
    expect(assetsControllerUploadMock).toHaveBeenCalledTimes(1);
    expect(backfillMirroredWebgalAssetCache).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
