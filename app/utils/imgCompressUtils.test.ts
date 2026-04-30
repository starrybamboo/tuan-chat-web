import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  compressAvatarThumbImage,
  compressCardCoverImage,
  compressImage,
  compressSmallThumbnailImage,
  IMAGE_COMPRESSION_PRESETS,
  resolveImageCompressionOptions,
} from "./imgCompressUtils";

const imageCompressionMock = vi.hoisted(() => vi.fn());

vi.mock("browser-image-compression", () => ({
  default: imageCompressionMock,
}));

vi.mock("browser-image-compression/dist/browser-image-compression.js?url", () => ({
  default: "/assets/browser-image-compression.js",
}));

describe("imgCompressUtils", () => {
  beforeEach(() => {
    imageCompressionMock.mockReset();
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string }) => {
      return new Blob([new Uint8Array(128)], { type: options.fileType });
    });
  });

  it("解析对象形式的压缩配置", () => {
    expect(resolveImageCompressionOptions({
      maxWidthOrHeight: 512,
      quality: 0.6,
    })).toMatchObject({
      maxWidthOrHeight: 512,
      quality: 0.6,
      fileType: "image/webp",
    });
  });

  it("小缩略图预设包含像素和体积上限", async () => {
    const file = new File([new Uint8Array(1024)], "demo image.png", { type: "image/png" });

    const result = await compressSmallThumbnailImage(file);

    expect(imageCompressionMock).toHaveBeenCalledTimes(1);
    expect(imageCompressionMock).toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: IMAGE_COMPRESSION_PRESETS.smallThumbnail.maxWidthOrHeight,
      maxSizeMB: IMAGE_COMPRESSION_PRESETS.smallThumbnail.maxSizeKB / 1024,
      initialQuality: IMAGE_COMPRESSION_PRESETS.smallThumbnail.quality,
      fileType: "image/webp",
      useWebWorker: true,
    }));
    expect(result.name).toMatch(/^demoimage_\d+\.webp$/);
    expect(result.type).toBe("image/webp");
  });

  it("卡片封面预设使用对应尺寸", async () => {
    const file = new File([new Uint8Array(2048)], "cover.jpg", { type: "image/jpeg" });

    await compressCardCoverImage(file);

    expect(imageCompressionMock).toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: IMAGE_COMPRESSION_PRESETS.cardCover.maxWidthOrHeight,
      maxSizeMB: IMAGE_COMPRESSION_PRESETS.cardCover.maxSizeKB / 1024,
      initialQuality: IMAGE_COMPRESSION_PRESETS.cardCover.quality,
    }));
  });

  it("头像缩略图预设用于所有 128px 头像", async () => {
    const file = new File([new Uint8Array(2048)], "space-avatar.png", { type: "image/png" });

    await compressAvatarThumbImage(file);

    expect(imageCompressionMock).toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: IMAGE_COMPRESSION_PRESETS.avatarThumb.maxWidthOrHeight,
      maxSizeMB: IMAGE_COMPRESSION_PRESETS.avatarThumb.maxSizeKB / 1024,
      initialQuality: IMAGE_COMPRESSION_PRESETS.avatarThumb.quality,
      fileType: "image/webp",
    }));
  });

  it("压缩结果比原图更大时回退原图", async () => {
    const file = new File([new Uint8Array(64)], "tiny.png", { type: "image/png" });
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string }) => {
      return new Blob([new Uint8Array(256)], { type: options.fileType });
    });

    await expect(compressImage(file, { maxWidthOrHeight: 320, quality: 0.8 })).resolves.toBe(file);
    expect(imageCompressionMock).toHaveBeenCalledTimes(4);
  });

  it("gif 保持原格式且不调用压缩库", async () => {
    const gif = new File([new Uint8Array([1, 2, 3])], "emoji.gif", { type: "image/gif" });

    const result = await compressImage(gif);

    expect(imageCompressionMock).not.toHaveBeenCalled();
    expect(result).not.toBe(gif);
    expect(result.type).toBe("image/gif");
    expect(result.name).toMatch(/^emoji_\d+\.gif$/);
  });
});
