import { describe, expect, it } from "vitest";

import { resolveResourceMediaType, resolveResourcePreviewUrl } from "./resourceMedia";

describe("resourceMedia", () => {
  it("优先使用接口返回的显式媒体类型", () => {
    expect(resolveResourceMediaType({
      type: "5",
      mediaType: "audio",
    })).toBe("audio");
  });

  it("在 mediaType 缺失时按图片资源类型推导预览地址", () => {
    expect(resolveResourceMediaType({
      type: "5",
      mediaType: undefined,
    })).toBe("image");
    expect(resolveResourcePreviewUrl({
      fileId: 15,
      type: "5",
      mediaType: undefined,
    })).toBe("https://tuan.chat/media/v1/files/015/15/image/medium.webp");
  });

  it("在 mediaType 缺失时按音频资源类型推导预览地址，即使运行时返回的是数字", () => {
    expect(resolveResourceMediaType({
      type: 6 as any,
      mediaType: undefined,
    })).toBe("audio");
    expect(resolveResourcePreviewUrl({
      fileId: 16,
      type: 6 as any,
      mediaType: undefined,
    })).toBe("https://tuan.chat/media/v1/files/016/16/audio/low.webm");
  });
});
