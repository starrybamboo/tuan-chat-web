import { describe, expect, it } from "vitest";

import { createCropStateFromCoordinates, createInitialCropCoordinates } from "./zoomableCropMath";

describe("zoomableCropMath", () => {
  it("将原图裁剪坐标换算为当前显示坐标", () => {
    expect(createCropStateFromCoordinates(
      { left: 200, top: 100, width: 800, height: 1200 },
      { width: 600, height: 900, naturalWidth: 1200, naturalHeight: 1800 },
    )).toEqual({
      crop: { unit: "%", x: 16.666666666666664, y: 5.555555555555555, width: 66.66666666666666, height: 66.66666666666666 },
      completedCrop: { unit: "px", x: 100, y: 50, width: 400, height: 600 },
    });
  });

  it("从已有裁剪上下文恢复开源裁剪器初始区域", () => {
    expect(createInitialCropCoordinates(
      { x: 20, y: 30, width: 400, height: 500 },
      800,
      1000,
    )).toEqual({ left: 20, top: 30, width: 400, height: 500 });
  });

  it("缺少有效尺寸时跳过初始区域恢复", () => {
    expect(createInitialCropCoordinates(undefined, 800, 1000)).toBeUndefined();
    expect(createInitialCropCoordinates({ width: 0, height: 100 }, 800, 1000)).toBeUndefined();
  });
});
