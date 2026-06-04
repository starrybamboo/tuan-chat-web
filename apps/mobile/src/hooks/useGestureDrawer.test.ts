import { describe, expect, it } from "vitest";

import {
  DRAWER_ACTIVE_OFFSET_X,
  DRAWER_OVERLAY_CAPTURE_OFFSET,
  getGestureDrawerAxisConfig,
  getRightDrawerClampRange,
  getRightDrawerEdgeHitSlop,
  getRightDrawerSnapPoints,
  shouldDrawerOverlayCaptureTouches,
} from "./useGestureDrawerConfig";

describe("useGestureDrawer", () => {
  it("收紧横向起手阈值和纵向滚动保护，避免斜向滚动被抽屉抢走", () => {
    expect(getGestureDrawerAxisConfig()).toEqual({
      activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
      failOffsetY: [-12, 12],
    });
  });

  it("右抽屉只从右边缘热区起手", () => {
    expect(getRightDrawerEdgeHitSlop()).toEqual({ right: 0, width: 24 });
  });

  it("只允许右侧抽屉手势范围", () => {
    expect(getRightDrawerClampRange(240)).toEqual({ max: 0, min: -240 });
    expect(getRightDrawerSnapPoints(240)).toEqual([-240, 0]);
  });

  it("轻提示阶段不让遮罩抢占详情页点击", () => {
    expect(shouldDrawerOverlayCaptureTouches(24)).toBe(false);
    expect(shouldDrawerOverlayCaptureTouches(DRAWER_OVERLAY_CAPTURE_OFFSET + 1)).toBe(true);
  });
});
