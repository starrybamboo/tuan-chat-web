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

  it("上传默认立绘时只等待原图完成，并复用原图作为立绘文件", async () => {
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
    const generate = vi.fn<(
      input: File,
      scene?: number,
    ) => Promise<GeneratedMediaUploadFiles>>().mockResolvedValue(payload);
    const upload = vi.fn<(
      input: GeneratedMediaUploadFiles,
      options?: UploadMediaFileOptions,
    ) => Promise<UploadedMediaFile>>()
      .mockResolvedValueOnce(firstUpload);
    const readDimensions = vi.fn<(input: File) => Promise<{ width: number; height: number }>>()
      .mockResolvedValue({ width: 800, height: 1200 });
    const options = { scene: 3 };

    const result = await uploadOriginAndDefaultSpriteMedia(file, options, {
      generateOriginalFirstImageUploadFiles: generate,
      uploadGeneratedMediaFiles: upload,
      readImageFileDimensions: readDimensions,
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(file, 3);
    expect(readDimensions).toHaveBeenCalledWith(generatedOriginal);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(payload, {
      ...options,
      completeAfterPrimaryQuality: true,
    });
    expect(result).toEqual({
      origin: firstUpload,
      sprite: firstUpload,
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
