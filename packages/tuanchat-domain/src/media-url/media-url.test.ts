import { describe, expect, it } from "vitest";

import {
  avatarOriginalUrl,
  avatarUrl,
  extractMediaFileIdFromUrl,
  imageHighUrl,
  imageHighUrlFromUrl,
  imageLowUrl,
  imageLowUrlFromUrl,
  imageMediumUrl,
  imageMediumUrlFromUrl,
  imageOriginalUrl,
  imageOriginalUrlFromUrl,
  imageUrlWithQuality,
  mediaFileUrl,
  mediaFileUrlWithQuality,
  mediaShard,
  mediaUrl,
  normalizeMediaType,
} from "./media-url";

describe("mediaShard", () => {
  it("对 fileId 取模 1000 并补零到 3 位", () => {
    expect(mediaShard(0)).toBe("000");
    expect(mediaShard(1)).toBe("001");
    expect(mediaShard(45)).toBe("045");
    expect(mediaShard(999)).toBe("999");
    expect(mediaShard(1000)).toBe("000");
    expect(mediaShard(1001)).toBe("001");
    expect(mediaShard(123456)).toBe("456");
  });

  it("支持字符串形式的 fileId", () => {
    expect(mediaShard("45")).toBe("045");
    expect(mediaShard("123456789012345")).toBe("345");
  });
});

describe("normalizeMediaType", () => {
  it("已知类型原样返回", () => {
    expect(normalizeMediaType("image")).toBe("image");
    expect(normalizeMediaType("audio")).toBe("audio");
    expect(normalizeMediaType("video")).toBe("video");
    expect(normalizeMediaType("document")).toBe("document");
    expect(normalizeMediaType("other")).toBe("other");
  });

  it("未知类型回退为 image", () => {
    expect(normalizeMediaType("unknown")).toBe("image");
    expect(normalizeMediaType("")).toBe("image");
    expect(normalizeMediaType(null)).toBe("image");
    expect(normalizeMediaType(undefined)).toBe("image");
  });
});

describe("mediaUrl — quality 映射", () => {
  it("图片 high 保留真实 high 路径", () => {
    expect(mediaUrl(1, "image", "high")).toBe("https://media.tuan.chat/media/v1/files/001/1/image/high.webp");
  });

  it("low/medium/original 不变", () => {
    expect(mediaUrl(1, "image", "low")).toBe("https://media.tuan.chat/media/v1/files/001/1/image/low.webp");
    expect(mediaUrl(1, "image", "medium")).toBe("https://media.tuan.chat/media/v1/files/001/1/image/medium.webp");
    expect(mediaUrl(1, "image", "original")).toBe("https://media.tuan.chat/media/v1/files/001/1/original");
  });

  it("音频/视频始终回退到 low", () => {
    expect(mediaUrl(1, "audio", "medium")).toBe("https://media.tuan.chat/media/v1/files/001/1/audio/low.webm");
    expect(mediaUrl(1, "audio", "high")).toBe("https://media.tuan.chat/media/v1/files/001/1/audio/low.webm");
    expect(mediaUrl(1, "video", "medium")).toBe("https://media.tuan.chat/media/v1/files/001/1/video/low.webm");
    expect(mediaUrl(1, "video", "high")).toBe("https://media.tuan.chat/media/v1/files/001/1/video/low.webm");
  });

  it("document/other 类型的展示档固定为 low 路径", () => {
    expect(mediaUrl(1, "document", "medium")).toBe("https://media.tuan.chat/media/v1/files/001/1/document/low");
    expect(mediaUrl(1, "other", "low")).toBe("https://media.tuan.chat/media/v1/files/001/1/other/low");
    expect(mediaUrl(1, "document", "original")).toBe("https://media.tuan.chat/media/v1/files/001/1/original");
  });
});

describe("mediaUrl — 边界情况", () => {
  it("fileId 为 null/undefined/空字符串时返回 undefined", () => {
    expect(mediaUrl(null, "image", "medium")).toBeUndefined();
    expect(mediaUrl(undefined, "image", "medium")).toBeUndefined();
    expect(mediaUrl("", "image", "medium")).toBeUndefined();
    expect(mediaUrl("  ", "image", "medium")).toBeUndefined();
  });

  it("自定义 CDN base URL", () => {
    expect(mediaUrl(45, "image", "medium", "https://cdn.example.com"))
      .toBe("https://cdn.example.com/media/v1/files/045/45/image/medium.webp");
  });

  it("cdn base URL 末尾斜杠被去除", () => {
    expect(mediaUrl(45, "image", "medium", "https://cdn.example.com/"))
      .toBe("https://cdn.example.com/media/v1/files/045/45/image/medium.webp");
  });
});

describe("mediaFileUrl", () => {
  it("接受字符串 mediaType 并规范化", () => {
    expect(mediaFileUrl(45, "image", "medium")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(mediaFileUrl(45, "unknown", "medium")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(mediaFileUrl(45, null, "low")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/low.webp");
  });
});

describe("mediaFileUrlWithQuality — URL 改写", () => {
  it("改写已有图片 URL 的质量级别", () => {
    const url = "https://media.tuan.chat/media/v1/files/045/45/image/low.webp";
    expect(mediaFileUrlWithQuality(url, "image", "medium")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
  });

  it("改写 original URL 为指定质量", () => {
    const url = "/media/v1/files/007/7/original";
    expect(mediaFileUrlWithQuality(url, "image", "low")).toBe("/media/v1/files/007/7/image/low.webp");
  });

  it("改写 document/other URL 为 low 路径", () => {
    expect(mediaFileUrlWithQuality("/media/v1/files/007/7/original", "document", "medium"))
      .toBe("/media/v1/files/007/7/document/low");
    expect(mediaFileUrlWithQuality("/media/v1/files/007/7/other/low", "other", "high"))
      .toBe("/media/v1/files/007/7/other/low");
  });

  it("high 输入保留为 high", () => {
    const url = "/media/v1/files/007/7/image/high.webp";
    expect(mediaFileUrlWithQuality(url, "image", "high")).toBe("/media/v1/files/007/7/image/high.webp");
  });

  it("非媒体 URL 原样返回", () => {
    expect(mediaFileUrlWithQuality("https://example.com/photo.jpg", "image", "medium")).toBe("https://example.com/photo.jpg");
  });

  it("null/undefined/空字符串返回 undefined", () => {
    expect(mediaFileUrlWithQuality(null, "image", "medium")).toBeUndefined();
    expect(mediaFileUrlWithQuality(undefined, "image", "medium")).toBeUndefined();
    expect(mediaFileUrlWithQuality("", "image", "medium")).toBeUndefined();
  });
});

describe("extractMediaFileIdFromUrl", () => {
  it("从标准媒体 URL 提取 fileId", () => {
    expect(extractMediaFileIdFromUrl("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp")).toBe(45);
    expect(extractMediaFileIdFromUrl("/media/v1/files/001/1/original")).toBe(1);
    expect(extractMediaFileIdFromUrl("/media/v1/files/456/123456/video/low.webm")).toBe(123456);
  });

  it("非媒体 URL 返回 undefined", () => {
    expect(extractMediaFileIdFromUrl("https://example.com/photo.jpg")).toBeUndefined();
    expect(extractMediaFileIdFromUrl("")).toBeUndefined();
    expect(extractMediaFileIdFromUrl(null)).toBeUndefined();
    expect(extractMediaFileIdFromUrl(undefined)).toBeUndefined();
  });
});

describe("图片质量便捷函数", () => {
  it("imageHighUrl 返回 high", () => {
    expect(imageHighUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/high.webp");
  });

  it("imageHighUrlFromUrl 返回 high", () => {
    const url = "/media/v1/files/007/7/image/low.webp";
    expect(imageHighUrlFromUrl(url)).toBe("/media/v1/files/007/7/image/high.webp");
  });
});

describe("avatar 便捷函数", () => {
  it("avatarUrl 返回 medium 质量", () => {
    expect(avatarUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
  });

  it("avatarOriginalUrl 返回 original", () => {
    expect(avatarOriginalUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/original");
  });
});

describe("imageUrlWithQuality", () => {
  it("改写图片 URL 到指定质量", () => {
    expect(imageUrlWithQuality("/media/v1/files/045/45/image/low.webp", "medium"))
      .toBe("/media/v1/files/045/45/image/medium.webp");
    expect(imageUrlWithQuality("/media/v1/files/045/45/original", "low"))
      .toBe("/media/v1/files/045/45/image/low.webp");
  });

  it("imageLowUrlFromUrl / imageMediumUrlFromUrl / imageOriginalUrlFromUrl", () => {
    const url = "/media/v1/files/045/45/image/medium.webp";
    expect(imageLowUrlFromUrl(url)).toBe("/media/v1/files/045/45/image/low.webp");
    expect(imageMediumUrlFromUrl(url)).toBe("/media/v1/files/045/45/image/medium.webp");
    expect(imageOriginalUrlFromUrl(url)).toBe("/media/v1/files/045/45/original");
  });
});

describe("image 便捷函数", () => {
  it("imageLowUrl / imageMediumUrl / imageOriginalUrl", () => {
    expect(imageLowUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/low.webp");
    expect(imageMediumUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(imageOriginalUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/original");
  });
});
