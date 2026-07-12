type ComposerModeEscapeEvent = Pick<KeyboardEvent, "isComposing" | "key">;

export const CANCEL_INSERT_MODE_SHORTCUT = "Esc";
export const CANCEL_INSERT_MODE_LABEL = `取消插入（${CANCEL_INSERT_MODE_SHORTCUT}）`;
export const CANCEL_POKE_MODE_LABEL = `取消戳一戳（${CANCEL_INSERT_MODE_SHORTCUT}）`;

export function getComposerInputModeClass(params: {
  isInsertMode: boolean;
  isPokeMode: boolean;
}): string {
  if (params.isPokeMode) {
    return params.isInsertMode
      ? "chatInputTextarea--insert-mode chatInputTextarea--poke-mode"
      : "chatInputTextarea--poke-mode";
  }
  if (params.isInsertMode) {
    return "chatInputTextarea--insert-mode";
  }
  return "";
}

export function shouldCancelComposerModeWithEscape(event: ComposerModeEscapeEvent): boolean {
  return event.key === "Escape" && !event.isComposing;
}

export const shouldCancelInsertModeWithEscape = shouldCancelComposerModeWithEscape;
