import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import { MessageEditorBlockRow } from "../../components/MessageEditorBlockRow";
import { createMessageEditorBlockDraft } from "../../model/messageEditorTransforms";

vi.mock("../../components/MessageEditorAtomicBlock", () => ({
  MessageEditorAtomicBlock: () => createElement("div", { "data-atomic-block": "true" }),
}));

vi.mock("../../components/MessageEditorTextBlock", () => ({
  MessageEditorTextBlock: () => createElement("div", { "data-text-block": "true" }),
}));

describe("MessageEditorBlockRow", () => {
  it("leaves virtualization layout ownership to the list adapter", () => {
    const html = renderToStaticMarkup(createElement(MessageEditorBlockRow, {
      active: false,
      blockId: "block-1",
      commandMenus: null,
      driverKind: "atomic",
      message: createMessageEditorBlockDraft("image"),
      onAtomicMouseDown: () => {},
      onDeleteAtomicBlock: () => {},
      onFocusAtomicBlock: () => {},
      onFocusTextBlock: () => {},
      onResizeAtomicBlock: () => {},
      onTextBlur: () => {},
      onTextInput: () => {},
      onTextKeyDown: () => {},
      onTextMouseDown: () => {},
      onTextPasteFiles: () => {},
      onTextPasteText: () => {},
      onUploadAtomicBlock: async () => {},
      placeholder: "",
      readOnly: false,
      registerBlockRef: () => {},
      registerBlockShellRef: () => {},
      renderSpeakerHandle: () => null,
      selectionSegment: null,
      shellClassName: "block-shell",
      showDropAfter: false,
      showDropBefore: false,
      textInputRef: { current: null },
    }));

    expect(html).toContain('data-me-block-row="true"');
    expect(html).not.toContain("content-visibility:auto");
    expect(html).not.toContain("contain-intrinsic-size");
    expect(html).not.toContain("overflow-clip-margin");
    expect(html).toContain('class="block-shell"');
    expect(html).toContain("pb-3");
  });
});
