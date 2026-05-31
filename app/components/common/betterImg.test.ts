import { describe, expect, it } from "vitest";

import { resolveBetterImgIntrinsicSize, resolveBetterImgPreviewToastOptions, resolveBetterImgZoomSrc } from "./betterImg";

describe("resolveBetterImgIntrinsicSize", () => {
  it("保留有效的宽高元数据，供图片在加载前建立稳定纵横比", () => {
    expect(resolveBetterImgIntrinsicSize({ width: 1280, height: 720 })).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it("会过滤无效尺寸，避免把异常值写进 img 属性", () => {
    expect(resolveBetterImgIntrinsicSize({ width: 0, height: Number.NaN })).toEqual({
      width: undefined,
      height: undefined,
    });
  });

  it("图片预览弹窗会使用高于线索编辑窗的根层级", () => {
    expect(resolveBetterImgPreviewToastOptions(true)).toEqual({
      fullScreen: true,
      transparent: true,
      rootClassName: "z-[11000]",
    });
  });

  it("可按调用方要求把媒体系统 URL 改写为 high 预览档", () => {
    expect(resolveBetterImgZoomSrc("/media/v1/files/045/45/image/low.webp", undefined, "high"))
      .toBe("/media/v1/files/045/45/image/high.webp");
  });

  it("可按调用方要求把媒体系统 URL 改写为 original 预览档", () => {
    expect(resolveBetterImgZoomSrc("/media/v1/files/045/45/image/medium.webp", undefined, "original"))
      .toBe("/media/v1/files/045/45/original");
  });

  it("有本地回退对象 URL 时优先使用本地预览", () => {
    expect(resolveBetterImgZoomSrc("/media/v1/files/045/45/image/low.webp", "blob:fallback", "high"))
      .toBe("blob:fallback");
  });
});
