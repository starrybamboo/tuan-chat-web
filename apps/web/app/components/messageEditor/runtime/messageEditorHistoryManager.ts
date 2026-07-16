import type { MessageEditorMessage } from "../messageEditorTypes";

export type MessageEditorHistoryFocus = {
  blockId: string;
  caret: number;
}

export type MessageEditorHistoryEntry = {
  focus: MessageEditorHistoryFocus | null;
  messages: MessageEditorMessage[];
  serialized: string;
}

export type MessageEditorHistoryKind = "default" | "typing";

export type MessageEditorHistoryAction = "redo" | "undo";

type MessageEditorHistoryEntryFactory = MessageEditorHistoryEntry | (() => MessageEditorHistoryEntry);

const MESSAGE_EDITOR_HISTORY_LIMIT = 100;
const MESSAGE_EDITOR_TYPING_HISTORY_INTERVAL_MS = 1000;

/**
 * 管理 MessageEditor 的撤销/重做栈。
 *
 * 这里保留私有可变状态，因为 undo / redo、typing merge、redo 清空和栈上限
 * 是一组跨方法 invariant，不适合散落在 React orchestrator 的多个 ref 中。
 */
export class MessageEditorHistoryManager {
  private readonly limit: number;
  private readonly now: () => number;
  private readonly typingMergeIntervalMs: number;
  private redoStack: MessageEditorHistoryEntry[] = [];
  private typingHistory: {
    baseSerialized: string;
    blockId: string;
    lastAt: number;
  } | null = null;
  private undoStack: MessageEditorHistoryEntry[] = [];

  constructor(options: {
    limit?: number;
    now?: () => number;
    typingMergeIntervalMs?: number;
  } = {}) {
    this.limit = options.limit ?? MESSAGE_EDITOR_HISTORY_LIMIT;
    this.now = options.now ?? (() => Date.now());
    this.typingMergeIntervalMs = options.typingMergeIntervalMs ?? MESSAGE_EDITOR_TYPING_HISTORY_INTERVAL_MS;
  }

  pushUndoEntry(
    entryOrFactory: MessageEditorHistoryEntryFactory,
    historyKind: MessageEditorHistoryKind = "default",
    historyGroupKey?: string | null,
  ) {
    const currentTime = this.now();
    if (
      historyKind === "typing"
      && historyGroupKey
      && this.canMergeTypingHistory(historyGroupKey, currentTime)
    ) {
      this.typingHistory!.lastAt = currentTime;
      this.redoStack = [];
      return;
    }

    const entry = typeof entryOrFactory === "function" ? entryOrFactory() : entryOrFactory;
    if (this.undoStack.at(-1)?.serialized === entry.serialized) {
      return;
    }

    const focusBlockId = historyGroupKey ?? entry.focus?.blockId;
    if (
      historyKind === "typing"
      && focusBlockId
      && this.canMergeTypingHistory(focusBlockId, currentTime)
    ) {
      this.typingHistory!.lastAt = currentTime;
      this.redoStack = [];
      return;
    }

    this.undoStack = this.appendBounded(this.undoStack, entry);
    this.redoStack = [];
    this.typingHistory = historyKind === "typing" && focusBlockId
      ? {
          baseSerialized: entry.serialized,
          blockId: focusBlockId,
          lastAt: currentTime,
        }
      : null;
  }

  restore(action: MessageEditorHistoryAction, currentEntry: MessageEditorHistoryEntry) {
    const sourceStack = action === "undo" ? this.undoStack : this.redoStack;
    const targetEntry = sourceStack.at(-1);
    if (!targetEntry) {
      return null;
    }

    this.typingHistory = null;
    if (action === "undo") {
      this.undoStack = sourceStack.slice(0, -1);
      this.redoStack = this.appendIfChanged(this.redoStack, currentEntry);
    }
    else {
      this.redoStack = sourceStack.slice(0, -1);
      this.undoStack = this.appendIfChanged(this.undoStack, currentEntry);
    }

    return targetEntry;
  }

  reset() {
    this.undoStack = [];
    this.redoStack = [];
    this.typingHistory = null;
  }

  snapshot() {
    return {
      redoDepth: this.redoStack.length,
      typingBaseSerialized: this.typingHistory?.baseSerialized ?? null,
      undoDepth: this.undoStack.length,
    };
  }

  private appendIfChanged(stack: MessageEditorHistoryEntry[], entry: MessageEditorHistoryEntry) {
    if (stack.at(-1)?.serialized === entry.serialized) {
      return stack;
    }
    return this.appendBounded(stack, entry);
  }

  private appendBounded(stack: MessageEditorHistoryEntry[], entry: MessageEditorHistoryEntry) {
    return [...stack, entry].slice(-this.limit);
  }

  private canMergeTypingHistory(blockId: string, currentTime: number) {
    return Boolean(
      this.typingHistory
      && this.typingHistory.blockId === blockId
      && this.typingHistory.baseSerialized === this.undoStack.at(-1)?.serialized
      && currentTime - this.typingHistory.lastAt <= this.typingMergeIntervalMs,
    );
  }
}
