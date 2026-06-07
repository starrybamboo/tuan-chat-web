import { afterEach, describe, expect, it, vi } from "vitest";

import {
  avatarThumbUrl,
  imageHighUrl,
  imageLowUrlFromUrl,
  imageMediumUrl,
  imageMediumUrlFromUrl,
  imageOriginalUrlFromUrl,
  imagePreviewUrl,
  imagePreviewUrlFromUrl,
  mediaFileUrl,
  mediaFileUrlWithQuality,
  mediaPreviewUrl,
  mediaShard,
  mediaThumbUrl,
  mediaUrl,
} from "./mediaUrl";

function stubWindowLocation(origin: string) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/chat/discover/material`,
      origin,
      protocol: new URL(origin).protocol,
    },
    isSecureContext: true,
  });
}

describe("mediaUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("根据 fileId 推导线上分片路径和图片三档 URL", () => {
    expect(mediaShard(1001)).toBe("001");
    expect(mediaUrl(1001, "image", "low")).toBe("https://media.tuan.chat/media/v1/files/001/1001/image/low.webp");
    expect(mediaUrl("202", "image", "original")).toBe("https://media.tuan.chat/media/v1/files/202/202/original");
    expect(avatarThumbUrl(7)).toBe("https://media.tuan.chat/media/v1/files/007/7/image/low.webp");
  });

  it("会在线上页面把默认媒体域名归一到独立媒体域", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(mediaUrl(1001, "image", "low")).toBe("https://media.tuan.chat/media/v1/files/001/1001/image/low.webp");
  });

  it("允许显式 CDN 配置覆盖默认线上域名", () => {
    vi.stubEnv("VITE_MEDIA_CDN_BASE_URL", "https://cdn.example.com/");

    expect(mediaUrl(1001, "image", "low")).toBe("https://cdn.example.com/media/v1/files/001/1001/image/low.webp");
  });

  it("会在线上 HTTPS 页面把不安全 CDN 地址归一到直连后端域名", () => {
    stubWindowLocation("https://tuan.chat");
    vi.stubEnv("VITE_MEDIA_CDN_BASE_URL", "http://101.126.143.129");

    expect(mediaUrl(1001, "image", "low")).toBe("https://api.tuan.chat/media/v1/files/001/1001/image/low.webp");
  });

  it("将已有媒体 URL 改写为适合展示场景的图片档位", () => {
    expect(imagePreviewUrlFromUrl("/media/v1/files/007/7/original")).toBe("/media/v1/files/007/7/image/medium.webp");
    expect(imageMediumUrlFromUrl("/media/v1/files/007/7/image/high.webp")).toBe("/media/v1/files/007/7/image/medium.webp");
    expect(mediaFileUrlWithQuality("/media/v1/files/007/7/image/medium.webp", "image", "high")).toBe("/media/v1/files/007/7/image/high.webp");
    expect(imageLowUrlFromUrl("https://cdn.example.com/media/v1/files/007/7/original?token=old")).toBe("https://cdn.example.com/media/v1/files/007/7/image/low.webp");
    expect(imageOriginalUrlFromUrl("/media/v1/files/007/7/image/low.webp")).toBe("/media/v1/files/007/7/original");
  });

  it("非媒体系统 URL 原样返回", () => {
    expect(imagePreviewUrlFromUrl("https://img.example.com/original.webp")).toBe("https://img.example.com/original.webp");
    expect(imageMediumUrlFromUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(imageLowUrlFromUrl("")).toBeUndefined();
  });

  it("按媒体类型改写已有音视频媒体 URL", () => {
    expect(mediaFileUrlWithQuality("/media/v1/files/009/9/original", "audio", "high")).toBe("/media/v1/files/009/9/audio/low.webm");
    expect(mediaFileUrlWithQuality("/media/v1/files/010/10/video/low.webm", "video", "medium")).toBe("/media/v1/files/010/10/video/low.webm");
  });

  it("图片 high 质量级别使用真实 high 路径", () => {
    expect(mediaUrl(45, "image", "high")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/high.webp");
    expect(imageHighUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/high.webp");
    expect(mediaFileUrl(45, "image", "high")).toBe(mediaUrl(45, "image", "high"));
  });

  it("deprecated 便捷函数保持兼容", () => {
    expect(imagePreviewUrl(45)).toBe(imageMediumUrl(45));
    expect(mediaPreviewUrl(45, "image")).toBe(imageMediumUrl(45));
    expect(mediaThumbUrl(45, "image")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/low.webp");
    expect(avatarThumbUrl(45)).toBe("https://media.tuan.chat/media/v1/files/045/45/image/low.webp");
  });
});
