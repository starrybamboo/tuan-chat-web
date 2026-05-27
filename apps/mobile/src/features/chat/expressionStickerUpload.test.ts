import { describe, expect, it } from "vitest";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";

import { buildStickerCreateRequest, createStickerCropFileName, getStickerUploadErrorMessage } from "./expressionStickerUpload";

describe("expressionStickerUpload", () => {
  const attachment = {
    fileName: "sticker.png",
    mimeType: "image/png",
  } satisfies Pick<MobileMessageAttachment, "fileName" | "mimeType">;

  it("会根据图片文件构建表情包创建请求", () => {
    expect(buildStickerCreateRequest(attachment, {
      fileId: 7,
      fileName: "uploaded.png",
      height: 128,
      size: 2048,
      width: 256,
    })).toEqual({
      fileId: 7,
      fileSize: 2048,
      format: "png",
      height: 128,
      name: "sticker.png",
      width: 256,
    });
  });

  it("会拒绝不支持的表情格式", () => {
    expect(() => buildStickerCreateRequest({
      fileName: "sticker.heic",
      mimeType: "image/heic",
    }, {
      fileId: 7,
      fileName: "uploaded.heic",
      height: 128,
      size: 2048,
      width: 256,
    })).toThrow("表情仅支持 jpg/jpeg/png/gif/webp");
  });

  it("会把上传异常转换成可展示的错误文案", () => {
    expect(getStickerUploadErrorMessage(new Error("文件不属于表情包场景"))).toBe("文件不属于表情包场景");
    expect(getStickerUploadErrorMessage(null)).toBe("表情包上传失败。");
  });

  it("会为裁剪后的表情生成 webp 文件名", () => {
    expect(createStickerCropFileName("sticker.png", 123)).toBe("sticker_sticker_123.webp");
    expect(createStickerCropFileName("  ", 123)).toBe("sticker_sticker_123.webp");
  });
});
