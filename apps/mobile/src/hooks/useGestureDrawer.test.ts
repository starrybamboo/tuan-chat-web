import { describe, expect, it } from "vitest";

import { getGestureDrawerAxisConfig } from "./useGestureDrawerConfig";

describe("useGestureDrawer", () => {
  it("配置纵向失败阈值，避免抢占消息列表滚动", () => {
    expect(getGestureDrawerAxisConfig()).toEqual({
      activeOffsetX: [-20, 20],
      failOffsetY: [-10, 10],
    });
  });
});
