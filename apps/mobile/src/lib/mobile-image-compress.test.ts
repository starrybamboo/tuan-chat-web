import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => ({
  getInfoAsync: vi.fn(),
}));

const imageManipulatorMock = vi.hoisted(() => ({
  manipulateAsync: vi.fn(),
  SaveFormat: {
    WEBP: "webp",
  },
}));

vi.mock("react-native", () => ({
  Platform: platformMock,
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: fileSystemMock.getInfoAsync,
}));

vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: imageManipulatorMock.manipulateAsync,
  SaveFormat: imageManipulatorMock.SaveFormat,
}));

describe("mobile image compression", () => {
  beforeEach(() => {
    platformMock.OS = "ios";
    fileSystemMock.getInfoAsync.mockReset();
    imageManipulatorMock.manipulateAsync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("compresses to webp with the requested preset metadata", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync.mockResolvedValueOnce({ uri: "file:///cache/avatar-low.webp" });
    fileSystemMock.getInfoAsync.mockResolvedValueOnce({ exists: true, size: 32 * 1024 });

    const result = await compressImageToWebp("file:///source/avatar.png", IMAGE_COMPRESS_PROFILES.low);

    expect(result).toEqual({ uri: "file:///cache/avatar-low.webp", size: 32 * 1024 });
    expect(imageManipulatorMock.manipulateAsync).toHaveBeenCalledWith(
      "file:///source/avatar.png",
      [{ resize: { width: 200 } }],
      { compress: 0.72, format: "webp" },
    );
  });

  it("reduces quality and dimensions until the output fits the preset size", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync
      .mockResolvedValueOnce({ uri: "file:///cache/round-1.webp" })
      .mockResolvedValueOnce({ uri: "file:///cache/round-2.webp" });
    fileSystemMock.getInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 300 * 1024 })
      .mockResolvedValueOnce({ exists: true, size: 120 * 1024 });

    const result = await compressImageToWebp("file:///source/sprite.png", IMAGE_COMPRESS_PROFILES.medium);

    expect(result).toEqual({ uri: "file:///cache/round-2.webp", size: 120 * 1024 });
    expect(imageManipulatorMock.manipulateAsync).toHaveBeenNthCalledWith(
      2,
      "file:///source/sprite.png",
      [{ resize: { width: 384 } }],
      { compress: expect.closeTo(0.494, 3), format: "webp" },
    );
  });

  it("throws when the compressed native file cannot be read", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync.mockResolvedValueOnce({ uri: "file:///cache/missing.webp" });
    fileSystemMock.getInfoAsync.mockResolvedValueOnce({ exists: false });

    await expect(compressImageToWebp("file:///source/avatar.png", IMAGE_COMPRESS_PROFILES.low))
      .rejects
      .toThrow("压缩后的图片文件不存在。");
  });

  it("uses blob size on web without treating the local URI as durable media data", async () => {
    const fetchMock = vi.fn(async () => ({
      blob: async () => new Blob([new Uint8Array(12)]),
    }));
    vi.stubGlobal("fetch", fetchMock);
    platformMock.OS = "web";
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync.mockResolvedValueOnce({ uri: "blob://compressed-preview" });

    const result = await compressImageToWebp("blob://source-preview", IMAGE_COMPRESS_PROFILES.low);

    expect(result).toEqual({ uri: "blob://compressed-preview", size: 12 });
    expect(fetchMock).toHaveBeenCalledWith("blob://compressed-preview");
    expect(fileSystemMock.getInfoAsync).not.toHaveBeenCalled();
  });
});
