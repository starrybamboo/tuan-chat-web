import { describe, expect, it } from "vitest";

import {
  buildMomentFeedRequestFromPostMedia,
  createStickerPublishImage,
  getPublishPostImagePreviewUrl,
} from "./publishPostMedia";

describe("publishPostMedia", () => {
  it("提交动态时只从 fileId 派生 MomentFeedRequest 图片 URL", () => {
    const result = buildMomentFeedRequestFromPostMedia("  新动态  ", [
      {
        id: "local-1",
        previewUrl: "blob:http://local-preview",
        fileId: 1001,
        mediaType: "image",
        uploading: false,
      },
    ]);

    expect(result.invalidImageIds).toEqual([]);
    expect(result.request).toEqual({
      content: "新动态",
      imageUrls: ["https://tuan.chat/media/v1/files/001/1001/image/medium.webp"],
      originalImageUrls: ["https://tuan.chat/media/v1/files/001/1001/original"],
    });
  });

  it("没有 fileId 的本地预览不会进入请求", () => {
    const result = buildMomentFeedRequestFromPostMedia("内容", [
      {
        id: "blob-only",
        previewUrl: "blob:http://local-preview",
        uploading: false,
      },
    ]);

    expect(result.invalidImageIds).toEqual(["blob-only"]);
    expect(result.request).toEqual({ content: "内容" });
  });

  it("表情包选择使用 Sticker fileId 而不是旧 imageUrl 字段", () => {
    const image = createStickerPublishImage({
      stickerId: 7,
      fileId: 2002,
      mediaType: "image",
      name: "ok",
      fileSize: 12,
    });

    expect(image).toMatchObject({
      id: "emoji_7",
      fileId: 2002,
      mediaType: "image",
      previewUrl: "https://tuan.chat/media/v1/files/002/2002/image/medium.webp",
    });
  });

  it("预览优先从 fileId 派生，避免旧 URL 覆盖正式媒体", () => {
    expect(getPublishPostImagePreviewUrl({
      fileId: 3003,
      mediaType: "image",
      previewUrl: "https://legacy.example/old.webp",
    })).toBe("https://tuan.chat/media/v1/files/003/3003/image/medium.webp");
  });
});
