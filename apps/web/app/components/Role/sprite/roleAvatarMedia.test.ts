import { describe, expect, it, vi } from "vitest";

import { normalizeLegacyMediaUrl, resolveRoleAvatarMedia } from "./roleAvatarMedia";

vi.mock("@/utils/mediaUrl", () => ({
  avatarOriginalUrl: (fileId?: number | string | null) => fileId ? `avatar-original:${fileId}` : "",
  avatarUrl: (fileId?: number | string | null) => fileId ? `avatar-medium:${fileId}` : "",
  imageLowUrl: (fileId?: number | string | null) => fileId ? `image-low:${fileId}` : "",
  imageMediumUrl: (fileId?: number | string | null) => fileId ? `image-medium:${fileId}` : "",
  imageOriginalUrl: (fileId?: number | string | null) => fileId ? `image-original:${fileId}` : "",
}));

describe("roleAvatarMedia", () => {
  it("头像槽位只解析 avatar fileId 和 avatar legacy 字段", () => {
    const media = resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
      spriteUrl: "https://example.test/sprite.webp",
      originUrl: "https://example.test/origin.webp",
    });

    expect(media.avatar.url).toBe("");
    expect(media.avatar.thumbUrl).toBe("");
    expect(media.avatar.originalUrl).toBe("");
  });

  it("立绘槽位不使用 avatar fileId 或 avatar legacy URL 兜底", () => {
    const media = resolveRoleAvatarMedia({
      avatarFileId: 100,
      avatarUrl: "https://example.test/avatar.webp",
      avatarThumbUrl: "https://example.test/avatar-thumb.webp",
      avatarOriginalUrl: "https://example.test/avatar-original.webp",
    });

    expect(media.sprite.url).toBe("");
    expect(media.sprite.cropSourceUrl).toBe("");
    expect(media.sprite.originalUrl).toBe("");
  });

  it("立绘槽位优先 spriteFileId，其次 sprite legacy，再使用 origin 兼容来源", () => {
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      spriteUrl: "https://example.test/legacy-sprite.webp",
      originFileId: 300,
    }).sprite.url).toBe("image-medium:200");

    expect(resolveRoleAvatarMedia({
      spriteUrl: " https://example.test/legacy-sprite.webp ",
      originFileId: 300,
    }).sprite.url).toBe("https://example.test/legacy-sprite.webp");

    expect(resolveRoleAvatarMedia({
      originFileId: 300,
      originUrl: "https://example.test/legacy-origin.webp",
    }).sprite.url).toBe("image-original:300");

    expect(resolveRoleAvatarMedia({
      originUrl: " https://example.test/legacy-origin.webp ",
    }).sprite.url).toBe("https://example.test/legacy-origin.webp");
  });

  it("origin 槽位只解析 origin fileId 和 origin legacy 字段", () => {
    expect(resolveRoleAvatarMedia({
      avatarFileId: 100,
      spriteFileId: 200,
      originFileId: 300,
    }).origin.url).toBe("image-original:300");

    expect(resolveRoleAvatarMedia({
      avatarFileId: 100,
      spriteFileId: 200,
      originUrl: " https://example.test/origin.webp ",
    }).origin.url).toBe("https://example.test/origin.webp");
  });

  it("legacy URL 只做 trim，不把空白字符串当成有效 URL", () => {
    expect(normalizeLegacyMediaUrl(" https://example.test/file.webp ")).toBe("https://example.test/file.webp");
    expect(normalizeLegacyMediaUrl("   ")).toBe("");
    expect(normalizeLegacyMediaUrl(null)).toBe("");
  });
});
