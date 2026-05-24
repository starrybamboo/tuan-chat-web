import { describe, expect, it } from "vitest";

import {
  buildDocCardCoverReferenceFields,
  buildDocCardReferencePayload,
  extractDocCardReferencePayload,
  resolveDocCardDisplayCoverUrl,
} from "./docCardMedia";

describe("docCardMedia", () => {
  it("有正式封面 fileId 时剥离 legacy imageUrl", () => {
    expect(buildDocCardReferencePayload({
      docId: " 42 ",
      roomId: 42,
      spaceId: 7,
      title: " 调查笔记 ",
      imageUrl: " https://legacy.example.com/cover.png ",
      imageFileId: 123,
      originalImageFileId: 456,
      imageMediaType: " image ",
      excerpt: " 摘要 ",
    })).toEqual({
      docId: "42",
      roomId: 42,
      spaceId: 7,
      title: "调查笔记",
      imageFileId: 123,
      originalImageFileId: 456,
      imageMediaType: "image",
      excerpt: "摘要",
    });
  });

  it("没有 fileId 的历史卡片才保留同槽位 legacy imageUrl", () => {
    expect(buildDocCardCoverReferenceFields({
      imageUrl: " https://legacy.example.com/cover.png ",
      imageMediaType: " image ",
    })).toEqual({
      imageUrl: "https://legacy.example.com/cover.png",
      imageMediaType: "image",
    });
  });

  it("解析嵌套和旧扁平 docCard extra 时都走同一归一化规则", () => {
    expect(extractDocCardReferencePayload({
      docCard: {
        docId: "99",
        imageUrl: "https://legacy.example.com/cover.png",
        imageFileId: 321,
      },
    })).toEqual({
      docId: "99",
      imageFileId: 321,
    });

    expect(extractDocCardReferencePayload({
      roomId: 77,
      title: "旧扁平文档",
      imageUrl: "https://legacy.example.com/flat.png",
    })).toEqual({
      docId: "77",
      roomId: 77,
      title: "旧扁平文档",
      imageUrl: "https://legacy.example.com/flat.png",
    });
  });

  it("显示 URL 优先从 fileId 派生，只有无 fileId 时才使用 legacy URL", () => {
    expect(resolveDocCardDisplayCoverUrl({
      imageFileId: 42,
      imageUrl: "https://legacy.example.com/cover.png",
    }, "medium")).toContain("/media/v1/files/042/42/image/medium.webp");

    expect(resolveDocCardDisplayCoverUrl({
      imageUrl: "https://legacy.example.com/media/v1/files/010/10/image/low.webp",
    }, "medium")).toBe("https://legacy.example.com/media/v1/files/010/10/image/medium.webp");
  });
});
