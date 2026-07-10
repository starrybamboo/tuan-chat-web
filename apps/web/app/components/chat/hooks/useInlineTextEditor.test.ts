import { describe, expect, it } from "vitest";

import { getInlineTextCommitValue, normalizeInlineRoleName } from "./useInlineTextEditor";

describe("getInlineTextCommitValue", () => {
  it("内容没有变化时不提交", () => {
    expect(getInlineTextCommitValue({
      initialValue: "汐",
      nextValue: "汐",
      normalize: normalizeInlineRoleName,
    })).toBeUndefined();
  });

  it("归一化后没有变化时不提交", () => {
    expect(getInlineTextCommitValue({
      initialValue: "汐",
      nextValue: "【 汐 】",
      normalize: normalizeInlineRoleName,
    })).toBeUndefined();
  });

  it("内容变化时返回归一化后的提交值", () => {
    expect(getInlineTextCommitValue({
      initialValue: "汐",
      nextValue: "【 澜 】",
      normalize: normalizeInlineRoleName,
    })).toBe("澜");
  });
});
