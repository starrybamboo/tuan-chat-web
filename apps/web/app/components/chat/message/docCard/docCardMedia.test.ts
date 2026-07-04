import { describe, expect, it } from "vitest";

import {
  buildDocCardCoverReferenceFields,
  buildDocCardReferencePayload,
  extractDocCardReferencePayload,
  resolveDocCardDisplayCoverUrl,
} from "./docCardMedia";

describe("docCardMedia", () => {
  it("只保留正式封面 fileId 字段", () => {
    expect(buildDocCardReferencePayload({
      docId: " 42 ",
      roomId: 42,
      spaceId: 7,
      title: " 调查笔记 ",
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

  it("没有 fileId 时不再保留 imageUrl", () => {
    expect(buildDocCardCoverReferenceFields({
      imageMediaType: " image ",
    })).toEqual({
      imageMediaType: "image",
    });
  });

  it("只解析嵌套 docCard extra", () => {
    expect(extractDocCardReferencePayload({
      docCard: {
        docId: "99",
        imageFileId: 321,
      },
    })).toEqual({
      docId: "99",
      imageFileId: 321,
    });

    expect(extractDocCardReferencePayload({
      roomId: 77,
      title: "扁平文档",
    })).toBeNull();
  });

  it("显示 URL 只从 fileId 派生", () => {
    expect(resolveDocCardDisplayCoverUrl({
      imageFileId: 42,
    }, "medium")).toContain("/media/v1/files/042/42/image/medium.webp");

    expect(resolveDocCardDisplayCoverUrl({
    }, "medium")).toBe("");
  });
});
