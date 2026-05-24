import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  compressAvatarThumbImage,
  compressCardCoverImage,
  compressImage,
  compressSmallThumbnailImage,
  IMAGE_COMPRESSION_PRESETS,
  resolveImageCompressionOptions,
} from "./imgCompressUtils";

const imageCompressionMock = vi.hoisted(() => vi.fn<(file: File, options: { fileType: string }) => Promise<Blob>>());

vi.mock("browser-image-compression/dist/browser-image-compression.js?url", () => ({
  default: "/assets/browser-image-compression.js",
}));

vi.mock("browser-image-compression", () => ({
  default: imageCompressionMock,
}));

describe("imgCompressUtils", () => {
  beforeEach(() => {
    imageCompressionMock.mockReset();
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string }) => {
      return new Blob([new Uint8Array(128)], { type: options.fileType });
    });
    vi.stubGlobal("imageCompression", imageCompressionMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("头像缩略图预设用于所有 200px 头像", async () => {
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

  it("同一文件同一配置会复用压缩缓存", async () => {
    const file = new File([new Uint8Array(1024)], "cache.png", { type: "image/png" });

    await compressImage(file, { maxWidthOrHeight: 320, quality: 0.8 });
    await compressImage(file, { maxWidthOrHeight: 320, quality: 0.8 });

    expect(imageCompressionMock).toHaveBeenCalledTimes(1);
  });

  it("目标体积压缩首轮超标时会降低长边重试", async () => {
    const file = new File([new Uint8Array(4096)], "fallback.png", { type: "image/png" });
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string; maxWidthOrHeight?: number }) => {
      const bytes = (options.maxWidthOrHeight === 960 ? 90 : 140) * 1024;
      return new Blob([new Uint8Array(bytes)], { type: options.fileType });
    });

    const result = await compressImage(file, {
      maxWidthOrHeight: 1280,
      maxSizeKB: 100,
      quality: 0.8,
      forceOutput: true,
    });

    expect(result.size).toBe(90 * 1024);
    expect(imageCompressionMock).toHaveBeenCalledTimes(2);
    expect(imageCompressionMock).toHaveBeenNthCalledWith(1, file, expect.objectContaining({
      maxWidthOrHeight: 1280,
      maxSizeMB: 100 / 1024,
    }));
    expect(imageCompressionMock).toHaveBeenNthCalledWith(2, file, expect.objectContaining({
      maxWidthOrHeight: 960,
      maxSizeMB: 100 / 1024,
    }));
  });

  it("目标体积压缩会按当前档位尺寸生成兜底长边", async () => {
    const file = new File([new Uint8Array(4096)], "low-fallback.png", { type: "image/png" });
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string; maxWidthOrHeight?: number }) => {
      const bytes = (options.maxWidthOrHeight === 150 ? 35 : 60) * 1024;
      return new Blob([new Uint8Array(bytes)], { type: options.fileType });
    });

    const result = await compressImage(file, {
      maxWidthOrHeight: 200,
      maxSizeKB: 40,
      quality: 0.72,
      forceOutput: true,
    });

    expect(result.size).toBe(35 * 1024);
    expect(imageCompressionMock).toHaveBeenCalledTimes(2);
    expect(imageCompressionMock).toHaveBeenNthCalledWith(2, file, expect.objectContaining({
      maxWidthOrHeight: 150,
      maxSizeMB: 40 / 1024,
    }));
  });

  it("目标体积压缩兜底后仍超标时会报错", async () => {
    const file = new File([new Uint8Array(4096)], "too-large.png", { type: "image/png" });
    imageCompressionMock.mockImplementation(async (_file: File, options: { fileType: string }) => {
      return new Blob([new Uint8Array(140 * 1024)], { type: options.fileType });
    });

    await expect(compressImage(file, {
      maxWidthOrHeight: 1280,
      maxSizeKB: 100,
      quality: 0.8,
      forceOutput: true,
    })).rejects.toThrow("图片压缩后仍超过 100KB");

    expect(imageCompressionMock).toHaveBeenCalledTimes(6);
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
