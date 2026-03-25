import { beforeEach, describe, expect, it, vi } from "vitest";

import { backfillMirroredWebgalAssetCache } from "./browserAssetCache";
import { uploadFile } from "./fileOperator";

vi.mock("./index", () => ({
  getTerreApis: vi.fn(() => ({
    assetsControllerReadAssets: vi.fn().mockResolvedValue({
      readDirPath: "",
      dirPath: "",
      dirInfo: [],
    }),
    assetsControllerUpload: vi.fn(),
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
});
