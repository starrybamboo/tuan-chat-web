import { describe, expect, it } from "vitest";

import { resolveResizableImgInitialTransform } from "./resizableImg";

describe("resolveResizableImgInitialTransform", () => {
  it("会按可视区域 contain 显示完整图片，并在需要时放大", () => {
    expect(resolveResizableImgInitialTransform({
      containerWidth: 1200,
      containerHeight: 900,
      imageWidth: 600,
      imageHeight: 300,
    })).toEqual({
      x: 0,
      y: 150,
      scale: 2,
    });
  });

  it("会在图片更大时缩小以显示完整内容", () => {
    expect(resolveResizableImgInitialTransform({
      containerWidth: 800,
      containerHeight: 600,
      imageWidth: 1600,
      imageHeight: 1200,
    })).toEqual({
      x: 0,
      y: 0,
      scale: 0.5,
    });
  });

  it("会过滤无效尺寸", () => {
    expect(resolveResizableImgInitialTransform({
      containerWidth: 0,
      containerHeight: 600,
      imageWidth: 1600,
      imageHeight: 1200,
    })).toBeUndefined();
  });

  it("容器高度未准备好时不会生成默认原尺寸位置", () => {
    expect(resolveResizableImgInitialTransform({
      containerWidth: 390,
      containerHeight: 0,
      imageWidth: 3000,
      imageHeight: 2200,
    })).toBeUndefined();
  });
});
