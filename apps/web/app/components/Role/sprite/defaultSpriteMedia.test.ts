import { describe, expect, it, vi } from "vitest";

import type { GeneratedMediaUploadFiles, UploadedMediaFile, UploadMediaFileOptions } from "@/utils/media/mediaUpload";

import { createFullSpriteCropContext, uploadOriginAndDefaultSpriteMedia } from "./defaultSpriteMedia";

describe("defaultSpriteMedia", () => {
  it("会为默认立绘生成全图裁剪上下文", () => {
    expect(createFullSpriteCropContext({ width: 640, height: 960 }, 101)).toEqual({
      sourceOriginFileId: 101,
      sourceWidth: 640,
      sourceHeight: 960,
      crop: {
        x: 0,
        y: 0,
        width: 640,
        height: 960,
      },
      outputWidth: 640,
      outputHeight: 960,
    });
  });

  it("上传原图和默认立绘时复用同一份派生媒体字节触发秒传", async () => {
    const file = new File(["raw-image"], "source.png", { type: "image/png" });
    const generatedOriginal = new File(["generated-webp"], "source.webp", { type: "image/webp" });
    const payload: GeneratedMediaUploadFiles = {
      original: generatedOriginal,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: {
        original: generatedOriginal,
      },
    };
    const firstUpload: UploadedMediaFile = {
      fileId: 201,
      mediaType: "image",
      uploadRequired: true,
    };
    const secondUpload: UploadedMediaFile = {
      fileId: 201,
      mediaType: "image",
      uploadRequired: false,
    };
    const generate = vi.fn<(
      input: File,
      scene?: number,
    ) => Promise<GeneratedMediaUploadFiles>>().mockResolvedValue(payload);
    const upload = vi.fn<(
      input: GeneratedMediaUploadFiles,
      options?: UploadMediaFileOptions,
    ) => Promise<UploadedMediaFile>>()
      .mockResolvedValueOnce(firstUpload)
      .mockResolvedValueOnce(secondUpload);
    const readDimensions = vi.fn<(input: File) => Promise<{ width: number; height: number }>>()
      .mockResolvedValue({ width: 800, height: 1200 });
    const options = { scene: 3 };

    const result = await uploadOriginAndDefaultSpriteMedia(file, options, {
      generateMediaUploadFiles: generate,
      uploadGeneratedMediaFiles: upload,
      readImageFileDimensions: readDimensions,
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(file, 3);
    expect(readDimensions).toHaveBeenCalledWith(generatedOriginal);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(1, payload, options);
    expect(upload).toHaveBeenNthCalledWith(2, payload, options);
    expect(result).toEqual({
      origin: firstUpload,
      sprite: secondUpload,
      spriteCropContext: {
        sourceOriginFileId: 201,
        sourceWidth: 800,
        sourceHeight: 1200,
        crop: {
          x: 0,
          y: 0,
          width: 800,
          height: 1200,
        },
        outputWidth: 800,
        outputHeight: 1200,
      },
    });
  });
});
