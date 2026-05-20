import { describe, expect, it } from "vitest";

import { isWithinBottomThreshold, resolveBottomThresholdTransition } from "./messageListScrollState";

describe("messageListScrollState", () => {
  it("按阈值判断是否仍在底部区域", () => {
    expect(isWithinBottomThreshold(0)).toBe(true);
    expect(isWithinBottomThreshold(49)).toBe(true);
    expect(isWithinBottomThreshold(50)).toBe(false);
    expect(isWithinBottomThreshold(120)).toBe(false);
  });

  it("只有跨越底部阈值时才报告状态变化", () => {
    expect(resolveBottomThresholdTransition(true, 10)).toEqual({ changed: false, isAtBottom: true });
    expect(resolveBottomThresholdTransition(true, 80)).toEqual({ changed: true, isAtBottom: false });
    expect(resolveBottomThresholdTransition(false, 120)).toEqual({ changed: false, isAtBottom: false });
    expect(resolveBottomThresholdTransition(false, 0)).toEqual({ changed: true, isAtBottom: true });
  });
});
