import { describe, expect, it } from "vitest";

import {
  canReuseAvatarMediaForVariantConfig,
  createAvatarCropContextFromImage,
  createAvatarCropContextFromSource,
  createAvatarCropContextFromVariantConfig,
  createPixelSpriteCropFromVariantConfig,
  createPixelCropFromVariantConfig,
  createSpriteCropContextFromImage,
  createSpriteCropContextFromVariantConfig,
  createSpriteTransformFromVariantConfig,
  createVariantCompositionConfigFromAvatarCropContext,
  isOriginImageCompatibleWithVariantConfig,
  isImageCompatibleWithVariantConfig,
} from "./avatarCropContext";

describe("avatarCropContext", () => {
  it("会把显示裁剪框换算成原始立绘画布像素", () => {
    const context = createAvatarCropContextFromImage(
      { unit: "px", x: 10, y: 20, width: 100, height: 120 },
      { naturalWidth: 1000, naturalHeight: 1600, width: 500, height: 800 },
      2048,
    );

    expect(context).toEqual({
      sourceSpriteFileId: 2048,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 40, width: 200, height: 240 },
    });
  });

  it("批量裁剪也会为每张图生成独立上下文对象", () => {
    const first = createAvatarCropContextFromSource(
      { unit: "px", x: 10, y: 10, width: 80, height: 80 },
      1000,
      1600,
      2,
      2,
      1001,
    );
    const second = createAvatarCropContextFromSource(
      { unit: "px", x: 10, y: 10, width: 80, height: 80 },
      1000,
      1600,
      2,
      2,
      1002,
    );

    expect(first).toEqual({
      sourceSpriteFileId: 1001,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 20, width: 160, height: 160 },
    });
    expect(second).toEqual({
      sourceSpriteFileId: 1002,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 20, width: 160, height: 160 },
    });
    expect(first).not.toBe(second);
  });

  it("会在绑定立绘组时从组合配置生成头像裁剪上下文", () => {
    const context = createAvatarCropContextFromVariantConfig({
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
    }, 3001);

    expect(context).toEqual({
      sourceSpriteFileId: 3001,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 40, width: 200, height: 240 },
    });
  });

  it("会把头像裁剪上下文保存成 WebGAL 组合配置", () => {
    const config = createVariantCompositionConfigFromAvatarCropContext({
      sourceSpriteFileId: 3001,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 40, width: 200, height: 240 },
    }, {
      sourceOriginFileId: 2001,
      sourceWidth: 1200,
      sourceHeight: 1800,
      crop: { x: 100, y: 100, width: 1000, height: 1600 },
      outputWidth: 1000,
      outputHeight: 1600,
    });

    expect(config).toEqual({
      mode: "sprite_avatar_overlay",
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      spriteCrop: {
        sourceOriginFileId: 2001,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 100, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 0, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
      output: { format: "webp" },
    });
  });

  it("会把 WebGAL transform 一起保存到立绘组配置", () => {
    const config = createVariantCompositionConfigFromAvatarCropContext({
      sourceSpriteFileId: 3001,
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 20, y: 40, width: 200, height: 240 },
    }, {
      sourceOriginFileId: 2001,
      sourceWidth: 1200,
      sourceHeight: 1800,
      crop: { x: 100, y: 100, width: 1000, height: 1600 },
      outputWidth: 1000,
      outputHeight: 1600,
    }, {
      positionX: 12,
      positionY: -8,
      scale: 1.25,
      alpha: 0.8,
      rotation: 5,
    });

    expect(config?.spriteTransform).toEqual({
      positionX: 12,
      positionY: -8,
      scale: 1.25,
      alpha: 0.8,
      rotation: 5,
    });
  });

  it("会从立绘组配置还原 WebGAL transform", () => {
    expect(createSpriteTransformFromVariantConfig({
      spriteTransform: {
        positionX: 12,
        positionY: -8,
        scale: 1.25,
        alpha: 0.8,
        rotation: 5,
      },
    })).toEqual({
      positionX: 12,
      positionY: -8,
      scale: 1.25,
      alpha: 0.8,
      rotation: 5,
    });
  });

  it("会把显示裁剪框换算成原图上的立绘裁剪上下文", () => {
    const context = createSpriteCropContextFromImage(
      { unit: "px", x: 50, y: 60, width: 500, height: 800 },
      { naturalWidth: 1200, naturalHeight: 1800, width: 600, height: 900 },
      2001,
    );

    expect(context).toEqual({
      sourceOriginFileId: 2001,
      sourceWidth: 1200,
      sourceHeight: 1800,
      crop: { x: 100, y: 120, width: 1000, height: 1600 },
      outputWidth: 1000,
      outputHeight: 1600,
    });
  });

  it("会从立绘组配置生成原图上的立绘裁剪框", () => {
    const config = {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      spriteCrop: {
        sourceOriginFileId: 2001,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
    };

    expect(isOriginImageCompatibleWithVariantConfig(config, { naturalWidth: 1200, naturalHeight: 1800 })).toBe(true);
    expect(isOriginImageCompatibleWithVariantConfig(config, { naturalWidth: 1000, naturalHeight: 1600 })).toBe(false);
    expect(createSpriteCropContextFromVariantConfig(config, 3001)).toEqual({
      sourceOriginFileId: 3001,
      sourceWidth: 1200,
      sourceHeight: 1800,
      crop: { x: 100, y: 120, width: 1000, height: 1600 },
      outputWidth: 1000,
      outputHeight: 1600,
    });
    expect(createPixelSpriteCropFromVariantConfig(
      config,
      { naturalWidth: 1200, naturalHeight: 1800, width: 600, height: 900 },
    )).toEqual({
      crop: { unit: "%", x: 8.3333, y: 6.6667, width: 83.3333, height: 88.8889 },
      pixelCrop: { unit: "px", x: 50, y: 60, width: 500, height: 800 },
    });
  });

  it("会把立绘组头像槽位换算成当前显示图片上的裁剪框", () => {
    const crop = createPixelCropFromVariantConfig(
      {
        canvas: { width: 1000, height: 1600 },
        avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      },
      { naturalWidth: 1000, naturalHeight: 1600, width: 500, height: 800 },
    );

    expect(crop).toEqual({
      crop: { unit: "%", x: 2, y: 2.5, width: 20, height: 15 },
      pixelCrop: { unit: "px", x: 10, y: 20, width: 100, height: 120 },
    });
  });

  it("会拒绝把不同画布尺寸的图片应用到立绘组", () => {
    const config = {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
    };

    expect(isImageCompatibleWithVariantConfig(config, { naturalWidth: 1000, naturalHeight: 1600 })).toBe(true);
    expect(isImageCompatibleWithVariantConfig(config, { naturalWidth: 1024, naturalHeight: 1600 })).toBe(false);
    expect(createPixelCropFromVariantConfig(config, { naturalWidth: 1024, naturalHeight: 1600, width: 512, height: 800 })).toBeUndefined();
  });

  it("应用到已有立绘组时可复用裁剪参数一致的已有媒体", () => {
    const config = {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      spriteCrop: {
        sourceOriginFileId: 2001,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 10, positionY: -5, scale: 1.25, alpha: 0.8, rotation: 3 },
    };

    expect(canReuseAvatarMediaForVariantConfig({
      avatarFileId: 401,
      spriteFileId: 402,
      avatarCropContext: {
        sourceSpriteFileId: 9999,
        sourceWidth: 1000,
        sourceHeight: 1600,
        crop: { x: 20, y: 40, width: 200, height: 240 },
      },
      spriteCropContext: {
        sourceOriginFileId: 8888,
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 10.00005, positionY: -5, scale: 1.25, alpha: 0.8, rotation: 3 },
    }, config)).toBe(true);
  });

  it("应用到已有立绘组时缺少现有媒体不会复用", () => {
    const config = {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      spriteCrop: {
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
    };

    expect(canReuseAvatarMediaForVariantConfig({
      avatarFileId: 401,
      avatarCropContext: {
        sourceWidth: 1000,
        sourceHeight: 1600,
        crop: { x: 20, y: 40, width: 200, height: 240 },
      },
      spriteCropContext: {
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
      },
    }, config)).toBe(false);
  });

  it("应用到已有立绘组时裁剪或变换不一致不会复用", () => {
    const config = {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 20, y: 40, width: 200, height: 240 },
      spriteCrop: {
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 0, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
    };
    const matchingAvatar = {
      avatarFileId: 401,
      spriteFileId: 402,
      avatarCropContext: {
        sourceWidth: 1000,
        sourceHeight: 1600,
        crop: { x: 20, y: 40, width: 200, height: 240 },
      },
      spriteCropContext: {
        sourceWidth: 1200,
        sourceHeight: 1800,
        crop: { x: 100, y: 120, width: 1000, height: 1600 },
        outputWidth: 1000,
        outputHeight: 1600,
      },
      spriteTransform: { positionX: 0, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
    };

    expect(canReuseAvatarMediaForVariantConfig({
      ...matchingAvatar,
      avatarCropContext: {
        ...matchingAvatar.avatarCropContext,
        crop: { x: 21, y: 40, width: 200, height: 240 },
      },
    }, config)).toBe(false);
    expect(canReuseAvatarMediaForVariantConfig({
      ...matchingAvatar,
      spriteTransform: { positionX: 1, positionY: 0, scale: 1, alpha: 1, rotation: 0 },
    }, config)).toBe(false);
  });
});
