import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getInfoAsyncMock,
  getSizeMock,
  manipulateAsyncMock,
} = vi.hoisted(() => ({
  getInfoAsyncMock: vi.fn(),
  getSizeMock: vi.fn(),
  manipulateAsyncMock: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: getInfoAsyncMock,
}));

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { WEBP: "webp" },
  manipulateAsync: manipulateAsyncMock,
}));

vi.mock("react-native", () => ({
  Image: {
    getSize: getSizeMock,
  },
  Platform: {
    OS: "ios",
  },
}));

import { compressImageToWebp, IMAGE_COMPRESS_PROFILES } from "./mobile-image-compress";

describe("mobile-image-compress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInfoAsyncMock.mockResolvedValue({ exists: true, size: 8 * 1024 });
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///compressed.webp" });
  });

  it("shrinks portrait images by constraining the longest edge", async () => {
    getSizeMock.mockImplementation((_uri: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(720, 1280);
    });

    await compressImageToWebp("file:///portrait.jpg", IMAGE_COMPRESS_PROFILES.low);

    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "file:///portrait.jpg",
      [{ resize: { width: 113, height: 200 } }],
      { compress: IMAGE_COMPRESS_PROFILES.low.quality, format: "webp" },
    );
  });

  it("does not upscale images already within the target size", async () => {
    getSizeMock.mockImplementation((_uri: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(120, 90);
    });

    await compressImageToWebp("file:///small.jpg", IMAGE_COMPRESS_PROFILES.low);

    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "file:///small.jpg",
      [],
      { compress: IMAGE_COMPRESS_PROFILES.low.quality, format: "webp" },
    );
  });

  it("uses the previous derivative as the source for the next compression round", async () => {
    getSizeMock.mockImplementation((uri: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(uri.includes("round-1") ? 160 : 720, uri.includes("round-1") ? 160 : 1280);
    });
    manipulateAsyncMock
      .mockResolvedValueOnce({ uri: "file:///round-1.webp" })
      .mockResolvedValueOnce({ uri: "file:///round-2.webp" });
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: true, size: 120 * 1024 })
      .mockResolvedValueOnce({ exists: true, size: 30 * 1024 });

    await compressImageToWebp("file:///source.jpg", IMAGE_COMPRESS_PROFILES.low);

    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      1,
      "file:///source.jpg",
      [{ resize: { width: 113, height: 200 } }],
      { compress: IMAGE_COMPRESS_PROFILES.low.quality, format: "webp" },
    );
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      2,
      "file:///round-1.webp",
      [{ resize: { width: 150, height: 150 } }],
      expect.objectContaining({ compress: expect.any(Number), format: "webp" }),
    );
  });
});
