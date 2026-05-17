import { describe, expect, it } from "vitest";

import { buildExpressionDraftAsset } from "./expressionSticker";

describe("expressionSticker", () => {
  it("会优先使用表情包自身的元数据构造发送素材", () => {
    expect(buildExpressionDraftAsset({
      fileId: 42,
      fileSize: 4096,
      format: "gif",
      height: 160,
      mediaType: "image",
      name: "开心.gif",
      width: 120,
    })).toEqual({
      fileId: 42,
      fileName: "开心.gif",
      height: 160,
      mediaType: "image",
      size: 4096,
      width: 120,
    });
  });

  it("会在表情包元数据缺失时补上稳定默认值", () => {
    expect(buildExpressionDraftAsset({
      fileId: 7,
      format: "png",
    })).toEqual({
      fileId: 7,
      fileName: "表情.png",
      height: 256,
      mediaType: "image",
      size: 1,
      width: 256,
    });
  });
});
