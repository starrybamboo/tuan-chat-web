type InsertModeEscapeEvent = Pick<KeyboardEvent, "isComposing" | "key">;

export const CANCEL_INSERT_MODE_SHORTCUT = "Esc";
export const CANCEL_INSERT_MODE_LABEL = `取消插入（${CANCEL_INSERT_MODE_SHORTCUT}）`;

export function shouldCancelInsertModeWithEscape(event: InsertModeEscapeEvent): boolean {
  return event.key === "Escape" && !event.isComposing;
}
