import { describe, expect, it, vi } from "vitest";

import {
  handleRoomMessageHistoryShortcutEvent,
  isEditableMessageHistoryShortcutTarget,
  resolveMessageHistoryShortcut,
  shouldHandleRoomMessageHistoryShortcut,
} from "./messageHistoryShortcuts";

type MockElement = {
  classList?: {
    contains: (className: string) => boolean;
  };
  closest?: (selector: string) => MockElement | null;
  isContentEditable?: boolean;
  parentElement?: MockElement | null;
  tagName?: string;
};

function shortcutEvent(options: Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">>) {
  return {
    altKey: false,
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...options,
  } as KeyboardEvent;
}

function keydownEvent(options: Partial<KeyboardEvent> & { target?: EventTarget | null }) {
  const {
    altKey,
    ctrlKey,
    key,
    metaKey,
    shiftKey,
    target,
  } = options;
  return {
    ...shortcutEvent({ altKey, ctrlKey, key, metaKey, shiftKey }),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: target ?? null,
  } as unknown as KeyboardEvent;
}

function mockElement(options: {
  chatInputTextarea?: boolean;
  closestSelectors?: string[];
  isContentEditable?: boolean;
  parentElement?: MockElement | null;
  tagName?: string;
} = {}): MockElement {
  const {
    chatInputTextarea = false,
    closestSelectors = [],
    isContentEditable = false,
    parentElement = null,
    tagName = "DIV",
  } = options;
  const element: MockElement = {
    classList: {
      contains: className => className === "chatInputTextarea" && chatInputTextarea,
    },
    closest(selector: string) {
      if (closestSelectors.includes(selector)) {
        return element;
      }
      return parentElement?.closest?.(selector) ?? null;
    },
    isContentEditable,
    parentElement,
    tagName,
  };
  return element;
}

describe("resolveMessageHistoryShortcut", () => {
  it("resolves undo and redo shortcuts", () => {
    expect(resolveMessageHistoryShortcut(shortcutEvent({ ctrlKey: true, key: "z" }))).toBe("undo");
    expect(resolveMessageHistoryShortcut(shortcutEvent({ metaKey: true, key: "Z" }))).toBe("undo");
    expect(resolveMessageHistoryShortcut(shortcutEvent({ ctrlKey: true, key: "y" }))).toBe("redo");
    expect(resolveMessageHistoryShortcut(shortcutEvent({ metaKey: true, key: "z", shiftKey: true }))).toBe("redo");
  });

  it("ignores shortcuts with alt or unsupported keys", () => {
    expect(resolveMessageHistoryShortcut(shortcutEvent({ altKey: true, ctrlKey: true, key: "z" }))).toBeNull();
    expect(resolveMessageHistoryShortcut(shortcutEvent({ ctrlKey: true, key: "x" }))).toBeNull();
    expect(resolveMessageHistoryShortcut(shortcutEvent({ key: "z" }))).toBeNull();
  });
});

describe("shouldHandleRoomMessageHistoryShortcut", () => {
  it("does not handle native and contentEditable targets", () => {
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement({ tagName: "INPUT" }) as unknown as EventTarget)).toBe(false);
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement({ tagName: "TEXTAREA" }) as unknown as EventTarget)).toBe(false);
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement({ isContentEditable: true }) as unknown as EventTarget)).toBe(false);
  });

  it("does not handle chat composer and editor targets even when the composer is empty", () => {
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement({ chatInputTextarea: true }) as unknown as EventTarget)).toBe(false);
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement({
      closestSelectors: ["[data-chat-input-scope]"],
    }) as unknown as EventTarget)).toBe(false);
  });

  it("does not handle inline message editor or message editor caption targets", () => {
    expect(isEditableMessageHistoryShortcutTarget(mockElement({
      closestSelectors: [".editable-field"],
    }) as unknown as EventTarget)).toBe(true);
    expect(isEditableMessageHistoryShortcutTarget(mockElement({
      closestSelectors: ["[data-me-atomic-caption]"],
    }) as unknown as EventTarget)).toBe(true);
  });

  it("walks from text-like children to editable parents", () => {
    const editableParent = mockElement({ closestSelectors: ["[data-chat-input-scope]"] });
    const childWithoutClosest = { parentElement: editableParent };

    expect(shouldHandleRoomMessageHistoryShortcut(childWithoutClosest as unknown as EventTarget)).toBe(false);
  });

  it("handles shortcuts from non-editable room chrome", () => {
    expect(shouldHandleRoomMessageHistoryShortcut(mockElement() as unknown as EventTarget)).toBe(true);
    expect(shouldHandleRoomMessageHistoryShortcut(null)).toBe(true);
  });
});

describe("handleRoomMessageHistoryShortcutEvent", () => {
  it("dispatches undo and redo from non-editable room chrome", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const undoEvent = keydownEvent({ ctrlKey: true, key: "z", target: mockElement() as unknown as EventTarget });
    const redoEvent = keydownEvent({ ctrlKey: true, key: "y", target: mockElement() as unknown as EventTarget });

    expect(handleRoomMessageHistoryShortcutEvent(undoEvent, { onRedo, onUndo })).toBe(true);
    expect(handleRoomMessageHistoryShortcutEvent(redoEvent, { onRedo, onUndo })).toBe(true);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(undoEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(redoEvent.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("leaves editable targets to their own undo history", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const event = keydownEvent({
      ctrlKey: true,
      key: "z",
      target: mockElement({ chatInputTextarea: true }) as unknown as EventTarget,
    });

    expect(handleRoomMessageHistoryShortcutEvent(event, { onRedo, onUndo })).toBe(false);

    expect(onUndo).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });
});
