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
      rootClassName: "z-[11000] items-center justify-center justify-items-center place-items-center",
      panelClassName: "max-h-dvh max-w-dvw overflow-hidden",
      bodyClassName: "flex items-center justify-center overflow-hidden",
      disableScroll: true,
    });
  });

  it("可按调用方要求把媒体系统 URL 改写为 high 预览档", () => {
    expect(resolveBetterImgZoomSrc("/media/v1/files/045/45/image/low.webp", "/media/v1/files/045/45/image/low.webp", "high"))
      .toBe("/media/v1/files/045/45/image/high.webp");
  });

  it("可按调用方要求把媒体系统 URL 改写为 original 预览档", () => {
    expect(resolveBetterImgZoomSrc("/media/v1/files/045/45/image/medium.webp", "/media/v1/files/045/45/image/medium.webp", "original"))
      .toBe("/media/v1/files/045/45/original");
  });

  it("当前展示图已回退到 original 时，预览继续使用 original", () => {
    expect(resolveBetterImgZoomSrc(
      "/media/v1/files/045/45/image/medium.webp",
      "/media/v1/files/045/45/original",
      "medium",
    )).toBe("/media/v1/files/045/45/original");
  });
});
