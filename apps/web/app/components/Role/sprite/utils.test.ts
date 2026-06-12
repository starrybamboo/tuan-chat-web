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
  it("头像裁剪源只使用已生成立绘，不回退到原图或头像图", () => {
    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      originFileId: 6488,
    })).toBe("");

    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
      spriteFileId: 6000,
      originFileId: 6488,
    })).toBe("image-medium:6000");

    expect(getSpriteCropSourceUrl({
      avatarFileId: 9918,
    })).toBe("");
  });

  it("立绘展示在缺少 spriteFileId 时不回退到原图或头像图", () => {
    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
      originFileId: 6488,
    })).toBeUndefined();

    expect(getEffectiveSpriteUrl({
      avatarFileId: 9918,
    })).toBeUndefined();
  });

});
