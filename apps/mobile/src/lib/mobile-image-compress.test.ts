import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => ({
  fileInfo: vi.fn(),
}));

const imageManipulatorMock = vi.hoisted(() => ({
  manipulateAsync: vi.fn(),
  SaveFormat: {
    WEBP: "webp",
  },
}));

const imageMock = vi.hoisted(() => ({
  getSize: vi.fn((uri: string, success: (width: number, height: number) => void) => {
    success(1024, 768);
  }),
}));

vi.mock("react-native", () => ({
  Image: imageMock,
  Platform: platformMock,
}));

vi.mock("expo-file-system", () => ({
  File: class {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    info() {
      return fileSystemMock.fileInfo(this.uri);
    }
  },
}));

vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: imageManipulatorMock.manipulateAsync,
  SaveFormat: imageManipulatorMock.SaveFormat,
}));

describe("mobile image compression", () => {
  beforeEach(() => {
    platformMock.OS = "ios";
    imageMock.getSize.mockImplementation((uri: string, success: (width: number, height: number) => void) => {
      success(1024, 768);
    });
    fileSystemMock.fileInfo.mockReset();
    imageManipulatorMock.manipulateAsync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("compresses to webp with the requested preset metadata", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync.mockResolvedValueOnce({ uri: "file:///cache/avatar-low.webp" });
    fileSystemMock.fileInfo.mockReturnValueOnce({ exists: true, size: 32 * 1024 });

    const result = await compressImageToWebp("file:///source/avatar.png", IMAGE_COMPRESS_PROFILES.low, {
      fileName: "avatar.png",
      quality: "low",
    });

    expect(result).toEqual({
      fileName: "avatar_low.webp",
      mimeType: "image/webp",
      uri: "file:///cache/avatar-low.webp",
      size: 32 * 1024,
    });
    expect(imageManipulatorMock.manipulateAsync).toHaveBeenCalledWith(
      "file:///source/avatar.png",
      [{ resize: { width: 200, height: 150 } }],
      { compress: 1, format: "webp" },
    );
  });

  it("reduces quality and dimensions until the output fits the preset size", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync
      .mockResolvedValueOnce({ uri: "file:///cache/round-1.webp" })
      .mockResolvedValueOnce({ uri: "file:///cache/round-2.webp" });
    fileSystemMock.fileInfo
      .mockReturnValueOnce({ exists: true, size: 300 * 1024 })
      .mockReturnValueOnce({ exists: true, size: 120 * 1024 });

    const result = await compressImageToWebp("file:///source/sprite.png", IMAGE_COMPRESS_PROFILES.medium);

    expect(result).toEqual({
      fileName: "image.webp",
      mimeType: "image/webp",
      uri: "file:///cache/round-2.webp",
      size: 120 * 1024,
    });
    expect(imageManipulatorMock.manipulateAsync).toHaveBeenNthCalledWith(
      2,
      "file:///cache/round-1.webp",
      [{ resize: { width: 384, height: 288 } }],
      { compress: 0.65, format: "webp" },
    );
  });

  it("throws when the compressed native file cannot be read", async () => {
    const { IMAGE_COMPRESS_PROFILES, compressImageToWebp } = await import("./mobile-image-compress");
    imageManipulatorMock.manipulateAsync.mockResolvedValueOnce({ uri: "file:///cache/missing.webp" });
    fileSystemMock.fileInfo.mockReturnValueOnce({ exists: false });

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

    expect(result).toEqual({
      fileName: "image.webp",
      mimeType: "image/webp",
      uri: "blob://compressed-preview",
      size: 12,
    });
    expect(fetchMock).toHaveBeenCalledWith("blob://compressed-preview");
    expect(fileSystemMock.fileInfo).not.toHaveBeenCalled();
  });
});
