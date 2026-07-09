import type { MessageEditorHistoryEntry } from "./messageEditorHistoryManager";

import { createMessageEditorTextDraft } from "../model/messageEditorTransforms";
import { MessageEditorHistoryManager } from "./messageEditorHistoryManager";

function createEntry(serialized: string, blockId = "block-a"): MessageEditorHistoryEntry {
  return {
    focus: {
      blockId,
      caret: 0,
    },
    messages: [createMessageEditorTextDraft({ content: serialized })],
    serialized,
  };
}

describe("MessageEditorHistoryManager", () => {
  it("skips duplicate undo entries", () => {
    const history = new MessageEditorHistoryManager();

    history.pushUndoEntry(createEntry("a"));
    history.pushUndoEntry(createEntry("a"));

    expect(history.snapshot().undoDepth).toBe(1);
  });

  it("merges continuous typing history for the same block", () => {
    let now = 1000;
    const history = new MessageEditorHistoryManager({ now: () => now });

    history.pushUndoEntry(createEntry("before"), "typing");
    now += 200;
    history.pushUndoEntry(createEntry("during"), "typing");

    expect(history.snapshot()).toMatchObject({
      redoDepth: 0,
      typingBaseSerialized: "before",
      undoDepth: 1,
    });
  });

  it("starts a new typing entry after the merge interval", () => {
    let now = 1000;
    const history = new MessageEditorHistoryManager({ now: () => now, typingMergeIntervalMs: 500 });

    history.pushUndoEntry(createEntry("before"), "typing");
    now += 700;
    history.pushUndoEntry(createEntry("during"), "typing");

    expect(history.snapshot().undoDepth).toBe(2);
  });

  it("moves current entry to redo stack when undoing", () => {
    const history = new MessageEditorHistoryManager();
    const before = createEntry("before");
    const current = createEntry("current");

    history.pushUndoEntry(before);
    const restored = history.restore("undo", current);

    expect(restored).toBe(before);
    expect(history.snapshot()).toMatchObject({
      redoDepth: 1,
      undoDepth: 0,
    });
  });

  it("respects the configured history limit", () => {
    const history = new MessageEditorHistoryManager({ limit: 2 });

    history.pushUndoEntry(createEntry("a"));
    history.pushUndoEntry(createEntry("b"));
    history.pushUndoEntry(createEntry("c"));

    expect(history.snapshot().undoDepth).toBe(2);
    expect(history.restore("undo", createEntry("current"))?.serialized).toBe("c");
    expect(history.restore("undo", createEntry("current-2"))?.serialized).toBe("b");
    expect(history.restore("undo", createEntry("current-3"))).toBeNull();
  });
});
