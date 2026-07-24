import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  MessageEditorTextBlock,
  resolveMessageEditorTextBlockViewState,
} from "../../block/MessageEditorTextBlock";

vi.mock("@/components/chat/message/editableMessageContent", () => ({
  default: () => createElement("div"),
}));

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

  it("文字选区按当前行高补齐垂直绘制高度", () => {
    const html = renderToStaticMarkup(createElement(MessageEditorTextBlock, {
      active: false,
      blockId: "block-1",
      message: { content: "selected text" },
      onFocus: () => {},
      onInput: () => {},
      onKeyDown: () => {},
      registerBlockRef: vi.fn(),
      selectionSegment: { end: 8, start: 0 },
    }));

    expect(html).toContain("py-[5px]");
    expect(html).toContain(">selected<");
  });
});
