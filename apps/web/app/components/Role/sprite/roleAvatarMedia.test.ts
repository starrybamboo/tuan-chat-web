import { describe, expect, it, vi } from "vitest";

import { resolveRoleAvatarMedia } from "./roleAvatarMedia";

vi.mock("@/utils/media/mediaUrl", () => ({
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

  it("立绘展示使用压缩图，头像裁剪源只使用 sprite 原图", () => {
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    }).sprite.url).toBe("image-medium:200");
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    }).sprite.cropSourceUrl).toBe("image-original:200");
    expect(resolveRoleAvatarMedia({
      spriteFileId: 200,
      originFileId: 300,
    }).sprite.originalUrl).toBe("image-original:200");

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

  it("本地临时 URL 优先用于上传中的预览和裁剪", () => {
    const media = resolveRoleAvatarMedia({
      avatarFileId: 100,
      spriteFileId: 200,
      originFileId: 300,
      localAvatarUrl: "blob:avatar",
      localOriginUrl: "blob:origin",
      localSpriteUrl: "blob:sprite",
    });

    expect(media.avatar.url).toBe("blob:avatar");
    expect(media.avatar.thumbUrl).toBe("image-low:100");
    expect(media.avatar.originalUrl).toBe("avatar-original:100");
    expect(media.sprite.url).toBe("blob:sprite");
    expect(media.sprite.cropSourceUrl).toBe("blob:sprite");
    expect(media.sprite.originalUrl).toBe("blob:sprite");
    expect(media.origin.url).toBe("blob:origin");
  });
});
