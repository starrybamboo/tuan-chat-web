import { describe, expect, it } from "vitest";

import type { MessageEditorSelection } from "../selection/messageEditorSelection";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
} from "../document/messageEditorTransforms";
import {
  focusEmptyTextBlockBeforeIme,
  getMessageEditorAtomicBlockShellClassName,
  isMessageEditorImportablePasteText,
  resolveMessageEditorFileDropPoint,
  resolveMessageEditorPointerAutoScrollDelta,
  resolveMessageEditorTextClickFocusPoint,
  shouldHandleMessageEditorAtomicBlockKeyDown,
  shouldFocusEmptyTextBlockOnPointerDown,
  shouldKeepMessageEditorFocusRestore,
  shouldIgnoreDocumentSelectionEventTarget,
  shouldStartMessageEditorAtomicBlockSelection,
} from "../MessageEditor";

type MockElement = {
  closest?: (selector: string) => MockElement | null;
  parentElement?: MockElement | null;
  tagName?: string;
};

function createMockElement(options: {
  closestSelectors?: string[];
  parentElement?: MockElement | null;
  tagName?: string;
} = {}): MockElement {
  const { closestSelectors = [], parentElement = null, tagName = "DIV" } = options;
  const element: MockElement = {
    closest(selector: string) {
      if (closestSelectors.includes(selector)) {
        return element;
      }
      return parentElement?.closest?.(selector) ?? null;
    },
    parentElement,
    tagName,
  };
  return element;
}

describe("messageEditor document click guard", () => {
  it("continues handling vertical arrows from a selected atomic block after its child prevents default", () => {
    expect(shouldHandleMessageEditorAtomicBlockKeyDown({
      altKey: false,
      ctrlKey: false,
      defaultPrevented: true,
      key: "ArrowDown",
      metaKey: false,
      readOnly: false,
    })).toBe(true);
    expect(shouldHandleMessageEditorAtomicBlockKeyDown({
      altKey: false,
      ctrlKey: false,
      defaultPrevented: false,
      key: "ArrowDown",
      metaKey: false,
      readOnly: true,
    })).toBe(false);
  });

  it("在空文本块的左键按下阶段建立输入焦点", () => {
    expect(shouldFocusEmptyTextBlockOnPointerDown({
      content: "",
      mouseButton: 0,
      readOnly: false,
    })).toBe(true);
    expect(shouldFocusEmptyTextBlockOnPointerDown({
      content: "已有内容",
      mouseButton: 0,
      readOnly: false,
    })).toBe(false);
    expect(shouldFocusEmptyTextBlockOnPointerDown({
      content: "",
      mouseButton: 2,
      readOnly: false,
    })).toBe(false);
    expect(shouldFocusEmptyTextBlockOnPointerDown({
      content: "",
      mouseButton: 0,
      readOnly: true,
    })).toBe(false);
  });

  it("已激活空块在按下阶段同步聚焦，避免首个输入法事件早于下一帧焦点恢复", () => {
    const calls: string[] = [];

    expect(focusEmptyTextBlockBeforeIme({
      active: true,
      content: "",
      mouseButton: 0,
      readOnly: false,
    }, {
      activate: () => calls.push("activate"),
      focusActiveEditor: () => calls.push("focus"),
    })).toBe(true);
    expect(calls).toEqual(["activate", "focus"]);

    calls.length = 0;
    expect(focusEmptyTextBlockBeforeIme({
      active: false,
      content: "",
      mouseButton: 0,
      readOnly: false,
    }, {
      activate: () => calls.push("activate"),
      focusActiveEditor: () => calls.push("focus"),
    })).toBe(true);
    expect(calls).toEqual(["activate"]);
  });

  it("exposes edit and click cursors on interactive block shells", () => {
    expect(getMessageEditorAtomicBlockShellClassName({
      isActive: false,
      isDragging: false,
      isSelected: false,
      readOnly: false,
    })).toContain("cursor-pointer");
    expect(getMessageEditorAtomicBlockShellClassName({
      isActive: false,
      isDragging: false,
      isSelected: false,
      readOnly: true,
    })).toContain("cursor-default");
    expect(getMessageEditorAtomicBlockShellClassName({
      isActive: true,
      isDragging: false,
      isSelected: false,
      readOnly: false,
    })).not.toContain("ring-info/80");
  });

  it("保留普通消息点击命中的文本偏移", () => {
    expect(resolveMessageEditorTextClickFocusPoint("target", {
      blockId: "target",
      offset: 3,
    })).toEqual({
      blockId: "target",
      offset: 3,
    });
  });

  it("仅在点击命中解析失败时回退到消息起点", () => {
    expect(resolveMessageEditorTextClickFocusPoint("target", null)).toEqual({
      blockId: "target",
      offset: 0,
    });
  });

  it("keeps a pending caret when the editable block focuses itself", () => {
    expect(shouldKeepMessageEditorFocusRestore({
      blockId: "target",
      caret: 12,
    }, "target")).toBe(true);
    expect(shouldKeepMessageEditorFocusRestore({
      selection: {
        focus: { blockId: "target", offset: 12 },
      } as MessageEditorSelection,
    }, "target")).toBe(true);
    expect(shouldKeepMessageEditorFocusRestore({
      blockId: "other",
      caret: 1,
    }, "target")).toBe(false);
    expect(shouldKeepMessageEditorFocusRestore(null, "target")).toBe(false);
  });

  it("resolves pointer auto-scroll near the document viewport edges", () => {
    const base = {
      edgeSize: 40,
      maxDelta: 20,
      viewportBottom: 200,
      viewportTop: 100,
    };

    expect(resolveMessageEditorPointerAutoScrollDelta({
      ...base,
      clientY: 100,
    })).toBe(-20);
    expect(resolveMessageEditorPointerAutoScrollDelta({
      ...base,
      clientY: 120,
    })).toBe(-10);
    expect(resolveMessageEditorPointerAutoScrollDelta({
      ...base,
      clientY: 150,
    })).toBe(0);
    expect(resolveMessageEditorPointerAutoScrollDelta({
      ...base,
      clientY: 180,
    })).toBe(10);
    expect(resolveMessageEditorPointerAutoScrollDelta({
      ...base,
      clientY: 200,
    })).toBe(20);
  });

  it("treats svg descendants inside the text style toolbar as internal clicks", () => {
    const toolbar = createMockElement({
      closestSelectors: [".text-style-toolbar"],
    });
    const svgChild = createMockElement({
      parentElement: toolbar,
      tagName: "svg",
    });

    expect(shouldIgnoreDocumentSelectionEventTarget(svgChild as unknown as EventTarget)).toBe(true);
  });

  it("treats text-like nodes inside the toolbar as internal clicks", () => {
    const toolbar = createMockElement({
      closestSelectors: [".text-style-toolbar"],
    });
    const textLikeNode = {
      parentElement: toolbar,
    };

    expect(shouldIgnoreDocumentSelectionEventTarget(textLikeNode as unknown as EventTarget)).toBe(true);
  });

  it("allows atomic block whitespace to start document selection", () => {
    const blankAtomicArea = createMockElement();

    expect(shouldStartMessageEditorAtomicBlockSelection(blankAtomicArea as unknown as EventTarget)).toBe(true);
  });

  it("allows an atomic image to start selection but keeps controls out", () => {
    const image = createMockElement({ tagName: "IMG" });
    const button = createMockElement({ tagName: "BUTTON" });
    const handleChild = createMockElement({
      closestSelectors: ["[data-me-block-handle]"],
    });

    expect(shouldStartMessageEditorAtomicBlockSelection(image as unknown as EventTarget)).toBe(true);
    expect(shouldStartMessageEditorAtomicBlockSelection(button as unknown as EventTarget)).toBe(false);
    expect(shouldStartMessageEditorAtomicBlockSelection(handleChild as unknown as EventTarget)).toBe(false);
  });
});

describe("messageEditor external file drop", () => {
  it("resolves block-edge indicators to insertion points for text and atomic blocks", () => {
    const text = createMessageEditorTextDraft({ content: "正文" });
    const image = createMessageEditorBlockDraft("image");
    const messages = [text, image];

    expect(resolveMessageEditorFileDropPoint({
      position: "after",
      targetBlockId: getMessageEditorBlockId(text),
    }, messages)).toEqual({
      blockId: getMessageEditorBlockId(text),
      offset: 2,
    });
    expect(resolveMessageEditorFileDropPoint({
      position: "before",
      targetBlockId: getMessageEditorBlockId(image),
    }, messages)).toEqual({
      blockId: getMessageEditorBlockId(image),
      offset: 0,
    });
    expect(resolveMessageEditorFileDropPoint({
      position: "after",
      targetBlockId: getMessageEditorBlockId(image),
    }, messages)).toEqual({
      blockId: getMessageEditorBlockId(image),
      offset: 1,
    });
  });
});

describe("messageEditor import paste detection", () => {
  it("detects tagged chat logs as importable paste text", () => {
    expect(isMessageEditorImportablePasteText("[KP]：门开了\n<PL>：我进去")).toBe(true);
  });

  it("ignores ordinary prose paste text", () => {
    expect(isMessageEditorImportablePasteText("这是一段普通文档内容，不应该弹导入确认。")).toBe(false);
  });
});
