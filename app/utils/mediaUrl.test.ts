import { describe, expect, it } from "vitest";

import {
  avatarThumbUrl,
  imageHighUrlFromUrl,
  imageLowUrlFromUrl,
  imageMediumUrlFromUrl,
  imageOriginalUrlFromUrl,
  mediaFileUrlWithQuality,
  mediaShard,
  mediaUrl,
} from "./mediaUrl";

describe("mediaUrl", () => {
  it("根据 fileId 推导分片路径和图片三档 URL", () => {
    expect(mediaShard(1001)).toBe("001");
    expect(mediaUrl(1001, "image", "low")).toBe("/media/v1/files/001/1001/image/low.webp");
    expect(mediaUrl("202", "image", "original")).toBe("/media/v1/files/202/202/original");
    expect(avatarThumbUrl(7)).toBe("/media/v1/files/007/7/image/low.webp");
  });

  it("将已有媒体 URL 改写为适合展示场景的图片档位", () => {
    expect(imageHighUrlFromUrl("/media/v1/files/007/7/original")).toBe("/media/v1/files/007/7/image/high.webp");
    expect(imageMediumUrlFromUrl("/media/v1/files/007/7/image/high.webp")).toBe("/media/v1/files/007/7/image/medium.webp");
    expect(imageLowUrlFromUrl("https://cdn.example.com/media/v1/files/007/7/original?token=old")).toBe("https://cdn.example.com/media/v1/files/007/7/image/low.webp");
    expect(imageOriginalUrlFromUrl("/media/v1/files/007/7/image/low.webp")).toBe("/media/v1/files/007/7/original");
  });

  it("非媒体系统 URL 原样返回", () => {
    expect(imageHighUrlFromUrl("https://img.example.com/original.webp")).toBe("https://img.example.com/original.webp");
    expect(imageMediumUrlFromUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(imageLowUrlFromUrl("")).toBe("");
  });

  it("按媒体类型改写已有音视频媒体 URL", () => {
    expect(mediaFileUrlWithQuality("/media/v1/files/009/9/original", "audio", "high")).toBe("/media/v1/files/009/9/audio/high.webm");
    expect(mediaFileUrlWithQuality("/media/v1/files/010/10/video/low.webm", "video", "medium")).toBe("/media/v1/files/010/10/video/medium.webm");
  });
});
