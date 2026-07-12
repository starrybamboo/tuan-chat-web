import { afterEach, describe, expect, it, vi } from "vitest";

import { range, roll } from "./dice";

describe("骰子表达式解析器", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("连续骰子运算保留中间骰点和最终骰点", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    expect(roll("1d3d6")).toEqual({
      result: 7,
      expanded: "1d3[2]d6[1+6]",
    });
  });

  it("连续骰子运算计算完整可能范围", () => {
    expect(range("1d3d6")).toEqual({ min: 1, max: 18 });
  });
});
