import { describe, expect, it } from "vitest";

import { resolveShouldAutoScrollAfterHistoryLoad } from "./useChatFrameScrollState";

describe("resolveShouldAutoScrollAfterHistoryLoad", () => {
  it("loading 期间不会触发自动滚底", () => {
    expect(resolveShouldAutoScrollAfterHistoryLoad({
      loading: true,
      hasAutoScrolledAfterLoad: false,
      isAtBottom: true,
    })).toBe(false);
  });

  it("加载完成后仍在底部时只允许自动滚底", () => {
    expect(resolveShouldAutoScrollAfterHistoryLoad({
      loading: false,
      hasAutoScrolledAfterLoad: false,
      isAtBottom: true,
    })).toBe(true);
  });

  it("已经自动滚过一次后不再重复触发", () => {
    expect(resolveShouldAutoScrollAfterHistoryLoad({
      loading: false,
      hasAutoScrolledAfterLoad: true,
      isAtBottom: true,
    })).toBe(false);
  });

  it("用户已离开底部时不会自动拉回底部", () => {
    expect(resolveShouldAutoScrollAfterHistoryLoad({
      loading: false,
      hasAutoScrolledAfterLoad: false,
      isAtBottom: false,
    })).toBe(false);
  });
});
