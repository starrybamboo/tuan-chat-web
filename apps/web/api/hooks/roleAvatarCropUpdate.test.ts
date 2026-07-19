import { describe, expect, it } from "vitest";

import { createAppliedSpriteAvatarPatch } from "./roleAvatarCropUpdate";

describe("createAppliedSpriteAvatarPatch", () => {
  it("应用立绘时会把同一媒体同步设为头像默认值", () => {
    const patch = createAppliedSpriteAvatarPatch(
      901,
      {
        sourceOriginFileId: 801,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      { positionX: 0, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
    );

    expect(patch).toEqual({
      avatarFileId: 901,
      spriteFileId: 901,
      spriteCropContext: {
        sourceOriginFileId: 801,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 0, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
    });
  });
});
