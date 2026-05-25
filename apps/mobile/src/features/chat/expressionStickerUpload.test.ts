import { describe, expect, it } from "vitest";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";

import { buildStickerCreateRequest } from "./expressionStickerUpload";

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
});
