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
});
