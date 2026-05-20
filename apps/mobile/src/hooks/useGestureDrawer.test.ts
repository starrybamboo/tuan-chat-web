import { describe, expect, it } from "vitest";

import {
  DRAWER_OVERLAY_CAPTURE_OFFSET,
  DRAWER_SWIPE_HINT_OFFSET,
  getGestureDrawerAxisConfig,
  resolveCloseWithSwipeHintStartPosition,
  shouldDrawerOverlayCaptureTouches,
  shouldUseSyntheticSwipeHint,
} from "./useGestureDrawerConfig";

describe("useGestureDrawer", () => {
  it("配置纵向失败阈值，避免抢占消息列表滚动", () => {
    expect(getGestureDrawerAxisConfig()).toEqual({
      activeOffsetX: [-8, 8],
      failOffsetY: [-24, 24],
    });
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
