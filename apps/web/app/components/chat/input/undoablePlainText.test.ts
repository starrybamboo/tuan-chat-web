import { describe, expect, it, vi } from "vitest";

import { insertPlainTextWithUndo } from "./undoablePlainText";

type FakeRange = {
  collapse: ReturnType<typeof vi.fn>;
  deleteContents: ReturnType<typeof vi.fn>;
  endContainer: object;
  insertNode: ReturnType<typeof vi.fn>;
  selectNodeContents?: ReturnType<typeof vi.fn>;
  setStartAfter: ReturnType<typeof vi.fn>;
  startContainer: object;
};

function createRange(startContainer: object, endContainer = startContainer): FakeRange {
  return {
    collapse: vi.fn(),
    deleteContents: vi.fn(),
    endContainer,
    insertNode: vi.fn(),
    setStartAfter: vi.fn(),
    startContainer,
  };
}

function createSelection(range: FakeRange) {
  return {
    addRange: vi.fn(),
    getRangeAt: vi.fn(() => range),
    rangeCount: 1,
    removeAllRanges: vi.fn(),
  };
}

function createEditorHarness(options: {
  execCommand?: ReturnType<typeof vi.fn>;
  range?: FakeRange;
} = {}) {
  const editorNode = {};
  const textNode = {};
  const range = options.range ?? createRange(editorNode);
  const selection = createSelection(range);
  const execCommand = options.execCommand ?? vi.fn(() => true);
  const createTextNode = vi.fn(() => textNode);
  const createRangeForEnd = vi.fn(() => ({
    collapse: vi.fn(),
    selectNodeContents: vi.fn(),
  }));
  const doc = {
    createRange: createRangeForEnd,
    createTextNode,
    defaultView: {
      getSelection: () => selection,
    },
    execCommand,
  };
  const editor = {
    contains: vi.fn((node: object) => node === editorNode),
    focus: vi.fn(),
    ownerDocument: doc,
  };

  return {
    createRangeForEnd,
    createTextNode,
    doc,
    editor,
    execCommand,
    range,
    selection,
    textNode,
  };
}

describe("insertPlainTextWithUndo", () => {
  it("uses the browser insertText command so contentEditable can record undo history", () => {
    const harness = createEditorHarness();

    expect(insertPlainTextWithUndo(harness.editor as unknown as HTMLElement, "hello")).toBe(true);

    expect(harness.editor.focus).toHaveBeenCalledTimes(1);
    expect(harness.execCommand).toHaveBeenCalledWith("insertText", false, "hello");
    expect(harness.range.insertNode).not.toHaveBeenCalled();
  });

  it("restores a saved selection before inserting delayed paste text", () => {
    const harness = createEditorHarness();
    const savedRange = harness.range;

    insertPlainTextWithUndo(harness.editor as unknown as HTMLElement, "pasted", {
      range: savedRange as unknown as Range,
    });

    expect(harness.selection.removeAllRanges).toHaveBeenCalledTimes(1);
    expect(harness.selection.addRange).toHaveBeenCalledWith(savedRange);
    expect(harness.execCommand).toHaveBeenCalledWith("insertText", false, "pasted");
  });

  it("falls back to direct range insertion when insertText is unavailable", () => {
    const execCommand = vi.fn(() => false);
    const harness = createEditorHarness({ execCommand });

    expect(insertPlainTextWithUndo(harness.editor as unknown as HTMLElement, "fallback")).toBe(true);

    expect(harness.createTextNode).toHaveBeenCalledWith("fallback");
    expect(harness.range.deleteContents).toHaveBeenCalledTimes(1);
    expect(harness.range.insertNode).toHaveBeenCalledWith(harness.textNode);
    expect(harness.range.setStartAfter).toHaveBeenCalledWith(harness.textNode);
    expect(harness.selection.addRange).toHaveBeenLastCalledWith(harness.range);
  });

  it("does not mutate selection when there is no text to insert", () => {
    const harness = createEditorHarness();

    expect(insertPlainTextWithUndo(harness.editor as unknown as HTMLElement, "")).toBe(false);

    expect(harness.execCommand).not.toHaveBeenCalled();
    expect(harness.editor.focus).not.toHaveBeenCalled();
  });
});
