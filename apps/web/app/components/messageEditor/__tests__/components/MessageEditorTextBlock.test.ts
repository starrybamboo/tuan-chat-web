import { describe, expect, it } from "vitest";

import { resolveMessageEditorTextBlockViewState } from "../../components/MessageEditorTextBlock";

describe("MessageEditorTextBlock", () => {
  it("非激活且没有选区时使用预览态", () => {
    expect(resolveMessageEditorTextBlockViewState({
      active: false,
      readOnly: false,
      selectionSegment: null,
    })).toEqual({ kind: "preview" });
  });

  it("激活且可编辑时使用源码编辑态", () => {
    expect(resolveMessageEditorTextBlockViewState({
      active: true,
      readOnly: false,
      selectionSegment: null,
    })).toEqual({ kind: "editable-source" });
  });

  it("跨块选区优先使用选中源码态", () => {
    const selectionSegment = { end: 5, showLineBreakAfter: true, start: 1 };

    expect(resolveMessageEditorTextBlockViewState({
      active: true,
      readOnly: true,
      selectionSegment,
    })).toEqual({
      kind: "selected-source",
      selectionSegment,
    });
  });

  it("只读激活块使用只读源码态", () => {
    expect(resolveMessageEditorTextBlockViewState({
      active: true,
      readOnly: true,
      selectionSegment: null,
    })).toEqual({ kind: "readonly-source" });
  });
});
