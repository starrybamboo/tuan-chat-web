import { describe, expect, it, vi } from "vitest";

import { resolveRoleAvatarMedia } from "./roleAvatarMedia";

vi.mock("@/utils/mediaUrl", () => ({
  avatarOriginalUrl: (fileId?: number | string | null) => fileId ? `avatar-original:${fileId}` : "",
  avatarUrl: (fileId?: number | string | null) => fileId ? `avatar-medium:${fileId}` : "",
  imageLowUrl: (fileId?: number | string | null) => fileId ? `image-low:${fileId}` : "",
  imageMediumUrl: (fileId?: number | string | null) => fileId ? `image-medium:${fileId}` : "",
  imageOriginalUrl: (fileId?: number | string | null) => fileId ? `image-original:${fileId}` : "",
}));

describe("roleAvatarMedia", () => {
  it("头像槽位只解析 avatarFileId", () => {
    const media = resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    });

    expect(media.avatar.url).toBe("");
    expect(media.avatar.thumbUrl).toBe("");
    expect(media.avatar.originalUrl).toBe("");
  });

  it("立绘槽位不使用 avatarFileId 兜底", () => {
    const media = resolveRoleAvatarMedia({
      avatarFileId: 100,
    });

    expect(media.sprite.url).toBe("");
    expect(media.sprite.cropSourceUrl).toBe("");
    expect(media.sprite.originalUrl).toBe("");
  });

  it("立绘槽位只解析 spriteFileId，不回退到 originFileId", () => {
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    }).sprite.url).toBe("image-medium:200");
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    }).sprite.cropSourceUrl).toBe("image-medium:200");

    expect(resolveRoleAvatarMedia({
      originFileId: 300,
    }).sprite.url).toBe("");
    expect(resolveRoleAvatarMedia({
      originFileId: 300,
    }).sprite.cropSourceUrl).toBe("");
    expect(resolveRoleAvatarMedia({
      originFileId: 300,
    }).sprite.originalUrl).toBe("");
  });

  it("origin 槽位只解析 originFileId", () => {
    expect(resolveRoleAvatarMedia({
      avatarFileId: 100,
      spriteFileId: 200,
      originFileId: 300,
    }).origin.url).toBe("image-original:300");

    expect(resolveRoleAvatarMedia({
      avatarFileId: 100,
      spriteFileId: 200,
    }).origin.url).toBe("");
  });
});
