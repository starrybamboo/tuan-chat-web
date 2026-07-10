import { describe, expect, it } from "vitest";

import { resolveNextAtMentionSelectionIndex } from "@/components/atMentionSelection";

describe("resolveNextAtMentionSelectionIndex", () => {
  it("首项向上循环到末项", () => {
    expect(resolveNextAtMentionSelectionIndex({
      currentIndex: 0,
      direction: -1,
      itemCount: 4,
    })).toBe(3);
  });

  it("末项向下循环到首项", () => {
    expect(resolveNextAtMentionSelectionIndex({
      currentIndex: 3,
      direction: 1,
      itemCount: 4,
    })).toBe(0);
  });

  it("普通上下移动保持相邻选择", () => {
    expect(resolveNextAtMentionSelectionIndex({
      currentIndex: 2,
      direction: -1,
      itemCount: 4,
    })).toBe(1);
    expect(resolveNextAtMentionSelectionIndex({
      currentIndex: 1,
      direction: 1,
      itemCount: 4,
    })).toBe(2);
  });
});
