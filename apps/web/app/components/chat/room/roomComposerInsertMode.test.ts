import { describe, expect, it } from "vitest";

import {
  CANCEL_INSERT_MODE_LABEL,
  CANCEL_POKE_MODE_LABEL,
  getComposerInputModeClass,
  shouldCancelComposerModeWithEscape,
} from "./roomComposerInsertMode";

describe("roomComposerInsertMode", () => {
  it("Esc 可以取消插入或戳一戳模式", () => {
    expect(shouldCancelComposerModeWithEscape({ key: "Escape", isComposing: false } as KeyboardEvent)).toBe(true);
  });

  it("输入法组合态下不会用 Esc 取消输入模式", () => {
    expect(shouldCancelComposerModeWithEscape({ key: "Escape", isComposing: true } as KeyboardEvent)).toBe(false);
  });

  it("插入和戳一戳取消按钮提示都包含 Esc 快捷键", () => {
    expect(CANCEL_INSERT_MODE_LABEL).toContain("Esc");
    expect(CANCEL_POKE_MODE_LABEL).toContain("Esc");
  });

  it("戳一戳模式会追加独立光标类名", () => {
    expect(getComposerInputModeClass({
      isInsertMode: true,
      isPokeMode: true,
    })).toBe("chatInputTextarea--insert-mode chatInputTextarea--poke-mode");
    expect(getComposerInputModeClass({
      isInsertMode: false,
      isPokeMode: true,
    })).toBe("chatInputTextarea--poke-mode");
    expect(getComposerInputModeClass({
      isInsertMode: true,
      isPokeMode: false,
    })).toBe("chatInputTextarea--insert-mode");
    expect(getComposerInputModeClass({
      isInsertMode: false,
      isPokeMode: false,
    })).toBe("");
  });
});
