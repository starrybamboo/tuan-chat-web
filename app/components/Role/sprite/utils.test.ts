import { describe, expect, it, vi } from "vitest";

import {
  getEffectiveSpriteUrl,
  getSpriteCropSourceUrl,
} from "./utils";

vi.mock("@/utils/mediaUrl", () => ({
  avatarOriginalUrl: (fileId?: number | string | null) => fileId ? `avatar-original:${fileId}` : "",
  avatarUrl: (fileId?: number | string | null) => fileId ? `avatar-medium:${fileId}` : "",
  imageLowUrl: (fileId?: number | string | null) => fileId ? `image-low:${fileId}` : "",
  imageMediumUrl: (fileId?: number | string | null) => fileId ? `image-medium:${fileId}` : "",
  imageOriginalUrl: (fileId?: number | string | null) => fileId ? `image-original:${fileId}` : "",
}));

describe("sprite utils", () => {
  it("头像裁剪源优先使用立绘，其次使用原图，不回退到头像图", () => {
    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      originFileId: 6488,
    })).toBe("image-original:6488");

    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      spriteFileId: 6000,
      originFileId: 6488,
    })).toBe("image-medium:6000");

    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
    })).toBe("");
  });

  it("头像裁剪源允许使用真实 legacy sprite/origin URL", () => {
    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      spriteUrl: "https://example.test/legacy-sprite.webp",
      originUrl: "https://example.test/legacy-origin.webp",
    })).toBe("https://example.test/legacy-sprite.webp");

    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      originUrl: "https://example.test/legacy-origin.webp",
    })).toBe("https://example.test/legacy-origin.webp");
  });

  it("立绘展示在缺少 spriteFileId 时优先使用原图，不回退到头像图", () => {
    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
      originFileId: 6488,
    })).toBe("image-original:6488");

    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
    })).toBeUndefined();
  });

  it("立绘展示允许使用真实 legacy sprite URL，但不回退到头像 URL", () => {
    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
      avatarUrl: "https://example.test/avatar.webp",
      spriteUrl: "https://example.test/legacy-sprite.webp",
    })).toBe("https://example.test/legacy-sprite.webp");

    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
      avatarUrl: "https://example.test/avatar.webp",
    })).toBeUndefined();
  });
});
