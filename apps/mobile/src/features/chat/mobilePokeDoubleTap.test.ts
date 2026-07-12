import { describe, expect, it } from "vitest";

import {
  MOBILE_POKE_DOUBLE_TAP_WINDOW_MS,
  resolveMobilePokeTap,
} from "./mobilePokeDoubleTap";

describe("resolveMobilePokeTap", () => {
  it("首次点击记录角色和时间", () => {
    expect(resolveMobilePokeTap(null, 7, 1_000)).toEqual({
      matched: false,
      next: {
        roleId: 7,
        timestamp: 1_000,
      },
    });
  });

  it("在 280ms 内双击同一角色时触发并清空状态", () => {
    expect(resolveMobilePokeTap(
      { roleId: 7, timestamp: 1_000 },
      7,
      1_000 + MOBILE_POKE_DOUBLE_TAP_WINDOW_MS,
    )).toEqual({
      matched: true,
      next: null,
    });
  });

  it("不同角色或超时点击会开始新的识别窗口", () => {
    expect(resolveMobilePokeTap(
      { roleId: 7, timestamp: 1_000 },
      8,
      1_100,
    )).toEqual({
      matched: false,
      next: {
        roleId: 8,
        timestamp: 1_100,
      },
    });

    expect(resolveMobilePokeTap(
      { roleId: 7, timestamp: 1_000 },
      7,
      1_000 + MOBILE_POKE_DOUBLE_TAP_WINDOW_MS + 1,
    )).toEqual({
      matched: false,
      next: {
        roleId: 7,
        timestamp: 1_000 + MOBILE_POKE_DOUBLE_TAP_WINDOW_MS + 1,
      },
    });
  });
});
