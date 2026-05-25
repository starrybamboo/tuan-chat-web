import { describe, expect, it } from "vitest";

import {
  DRAWER_ACTIVE_OFFSET_X,
  DRAWER_OVERLAY_CAPTURE_OFFSET,
  DRAWER_SWIPE_HINT_OFFSET,
  getGestureDrawerAxisConfig,
  getGestureDrawerClampRange,
  getGestureDrawerSnapPoints,
  resolveCloseWithSwipeHintStartPosition,
  shouldDrawerOverlayCaptureTouches,
  shouldUseSyntheticSwipeHint,
} from "./useGestureDrawerConfig";

const DISABLED_LEFT_SWIPE_OPTIONS = {
  allowLeftDrawerSwipe: false,
  leftDrawerWidth: 320,
  rightDrawerWidth: 240,
} as const;

describe("useGestureDrawer", () => {
  it("放宽横向起手阈值，同时保留纵向滚动保护", () => {
    expect(getGestureDrawerAxisConfig()).toEqual({
      activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
      failOffsetY: [-40, 40],
    });
  });

  it("可禁用左侧房间抽屉手势，同时保留右侧面板手势", () => {
    const positiveSnapPoints = getGestureDrawerSnapPoints(160, DISABLED_LEFT_SWIPE_OPTIONS);

    expect(getGestureDrawerClampRange(DISABLED_LEFT_SWIPE_OPTIONS).max).toBe(0);
    expect(positiveSnapPoints).toEqual([-240, 0]);
    expect(getGestureDrawerSnapPoints(-160, DISABLED_LEFT_SWIPE_OPTIONS)).toEqual([-240, 0]);
  });

  it("从路由页进入详情时补一个左侧滑动提示", () => {
    expect(shouldUseSyntheticSwipeHint(0)).toBe(true);
    expect(resolveCloseWithSwipeHintStartPosition(0)).toBe(DRAWER_SWIPE_HINT_OFFSET);
  });

  it("抽屉已经打开时沿用当前位移做 spring 收起", () => {
    expect(shouldUseSyntheticSwipeHint(DRAWER_SWIPE_HINT_OFFSET + 1)).toBe(false);
    expect(resolveCloseWithSwipeHintStartPosition(160)).toBe(160);
    expect(resolveCloseWithSwipeHintStartPosition(-120)).toBe(-120);
  });

  it("轻提示阶段不让遮罩抢占详情页点击", () => {
    expect(shouldDrawerOverlayCaptureTouches(DRAWER_SWIPE_HINT_OFFSET)).toBe(false);
    expect(shouldDrawerOverlayCaptureTouches(DRAWER_OVERLAY_CAPTURE_OFFSET + 1)).toBe(true);
  });
});
