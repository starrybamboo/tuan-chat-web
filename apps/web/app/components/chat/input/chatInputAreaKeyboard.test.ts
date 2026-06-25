import { describe, expect, it } from "vitest";

import { shouldInsertSoftLineBreak } from "./chatInputArea";

function keyEvent(options: Partial<Parameters<typeof shouldInsertSoftLineBreak>[0]> = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    key: "Enter",
    metaKey: false,
    shiftKey: false,
    ...options,
  };
}

describe("shouldInsertSoftLineBreak", () => {
  it("Shift+Enter 会插入软换行", () => {
    expect(shouldInsertSoftLineBreak(keyEvent({ shiftKey: true }))).toBe(true);
  });

  it("单独 Enter 保留给提交逻辑", () => {
    expect(shouldInsertSoftLineBreak(keyEvent())).toBe(false);
  });

  it("带控制键的 Enter 不会被当作软换行", () => {
    expect(shouldInsertSoftLineBreak(keyEvent({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(shouldInsertSoftLineBreak(keyEvent({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(shouldInsertSoftLineBreak(keyEvent({ altKey: true, shiftKey: true }))).toBe(false);
  });
});
