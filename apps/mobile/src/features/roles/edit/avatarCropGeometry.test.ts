import { describe, expect, it } from "vitest";

import { clampAvatarCropTranslation } from "./avatarCropGeometry";

describe("clampAvatarCropTranslation", () => {
  it("图片放大后把位移限制在裁剪框可覆盖范围内", () => {
    expect(clampAvatarCropTranslation({
      cropSize: 200,
      displayHeight: 300,
      displayWidth: 400,
      scale: 2,
      translateX: 999,
      translateY: -999,
    })).toEqual({
      x: 300,
      y: -200,
    });
  });

  it("图片尺寸不超过裁剪框时禁止继续拖出空白", () => {
    expect(clampAvatarCropTranslation({
      cropSize: 300,
      displayHeight: 280,
      displayWidth: 280,
      scale: 1,
      translateX: 80,
      translateY: -80,
    })).toEqual({
      x: 0,
      y: 0,
    });
  });
});
