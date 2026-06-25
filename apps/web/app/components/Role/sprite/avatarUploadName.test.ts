import { describe, expect, it } from "vitest";

import { resolveAvatarUploadName } from "./avatarUploadName";

describe("resolveAvatarUploadName", () => {
  it("使用不带扩展名的图片文件名作为头像名", () => {
    expect(resolveAvatarUploadName("爱丽丝.png")).toBe("爱丽丝");
    expect(resolveAvatarUploadName("character.final.webp")).toBe("character.final");
  });

  it("兼容空白、路径片段和无扩展名文件", () => {
    expect(resolveAvatarUploadName("  C:\\tmp\\头像 01.jpg  ")).toBe("头像 01");
    expect(resolveAvatarUploadName("no-extension")).toBe("no-extension");
    expect(resolveAvatarUploadName("   ")).toBeUndefined();
  });
});
