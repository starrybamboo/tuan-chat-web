import { describe, expect, it } from "vitest";

import { resolveBetterImgIntrinsicSize } from "./betterImg";

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
});
