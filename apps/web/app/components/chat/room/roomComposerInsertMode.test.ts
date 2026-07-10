import { describe, expect, it } from "vitest";

import { CANCEL_INSERT_MODE_LABEL, shouldCancelInsertModeWithEscape } from "./roomComposerInsertMode";

describe("roomComposerInsertMode", () => {
  it("Esc 可以取消插入模式", () => {
    expect(shouldCancelInsertModeWithEscape({ key: "Escape", isComposing: false } as KeyboardEvent)).toBe(true);
  });

  it("输入法组合态下不会用 Esc 取消插入模式", () => {
    expect(shouldCancelInsertModeWithEscape({ key: "Escape", isComposing: true } as KeyboardEvent)).toBe(false);
  });

  it("取消按钮提示包含 Esc 快捷键", () => {
    expect(CANCEL_INSERT_MODE_LABEL).toContain("Esc");
  });
});
