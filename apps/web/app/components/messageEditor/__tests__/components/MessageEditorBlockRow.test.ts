import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import {
  MessageEditorBlockRow,
  shouldCaptureMessageEditorAtomicMediaArrowKey,
} from "../../MessageEditorBlockRow";
import { createMessageEditorBlockDraft } from "../../document/messageEditorTransforms";

vi.mock("../../media/MessageEditorAtomicBlock", () => ({
  MessageEditorAtomicBlock: () => createElement("div", { "data-atomic-block": "true" }),
}));

vi.mock("../../text/MessageEditorTextBlock", () => ({
  MessageEditorTextBlock: () => createElement("div", { "data-text-block": "true" }),
}));

describe("MessageEditorBlockRow", () => {
  it("captures vertical arrows from natively focused media", () => {
    expect(shouldCaptureMessageEditorAtomicMediaArrowKey({ tagName: "VIDEO" } as unknown as EventTarget, "ArrowDown")).toBe(true);
    expect(shouldCaptureMessageEditorAtomicMediaArrowKey({ tagName: "AUDIO" } as unknown as EventTarget, "ArrowUp")).toBe(true);
    expect(shouldCaptureMessageEditorAtomicMediaArrowKey({ tagName: "VIDEO" } as unknown as EventTarget, "ArrowLeft")).toBe(false);
    expect(shouldCaptureMessageEditorAtomicMediaArrowKey({ tagName: "BUTTON" } as unknown as EventTarget, "ArrowDown")).toBe(false);
  });

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
