export type MessageHistoryShortcut = "redo" | "undo";

type ShortcutEventLike = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;
type ShortcutKeyboardEventLike = ShortcutEventLike & Pick<KeyboardEvent, "preventDefault" | "stopPropagation" | "target">;

type ElementLike = {
  classList?: {
    contains: (className: string) => boolean;
  };
  closest?: (selector: string) => ElementLike | null;
  isContentEditable?: boolean;
  parentElement?: ElementLike | null;
  tagName?: string;
};

const EDITABLE_TARGET_SELECTORS = [
  "[data-chat-input-scope]",
  ".editable-field",
  "[contenteditable=\"true\"]",
  "[data-me-atomic-caption]",
];

function toElementLike(target: EventTarget | null): ElementLike | null {
  const candidate = target as ElementLike | null;
  if (!candidate) {
    return null;
  }
  if (typeof candidate.closest === "function") {
    return candidate;
  }
  return candidate.parentElement ?? null;
}

export function resolveMessageHistoryShortcut(event: ShortcutEventLike): MessageHistoryShortcut | null {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey) {
    return null;
  }

  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && !event.shiftKey) {
    return "redo";
  }
  return null;
}

export function isEditableMessageHistoryShortcutTarget(target: EventTarget | null) {
  const element = toElementLike(target);
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return true;
  }

  if (element.isContentEditable || element.classList?.contains("chatInputTextarea")) {
    return true;
  }

  return EDITABLE_TARGET_SELECTORS.some(selector => Boolean(element.closest?.(selector)));
}

export function shouldHandleRoomMessageHistoryShortcut(target: EventTarget | null) {
  return !isEditableMessageHistoryShortcutTarget(target);
}

export function handleRoomMessageHistoryShortcutEvent(
  event: ShortcutKeyboardEventLike,
  handlers: {
    onRedo: () => void;
    onUndo: () => void;
  },
) {
  const shortcut = resolveMessageHistoryShortcut(event);
  if (!shortcut || !shouldHandleRoomMessageHistoryShortcut(event.target)) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  if (shortcut === "undo") {
    handlers.onUndo();
  }
  else {
    handlers.onRedo();
  }
  return true;
}
