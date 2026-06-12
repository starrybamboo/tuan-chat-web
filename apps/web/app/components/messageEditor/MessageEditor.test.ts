import { describe, expect, it } from "vitest";

import type { MessageEditorMessage } from "./messageEditorTypes";

import {
  buildRoomMessagePatchOperations,
  extractMessageEditorSlashQuery,
  getMessageEditorFrameClassName,
  getMessageEditorPatchMutationMeta,
  getMessageEditorScrollViewportClassName,
  getMessageEditorSlashMenuLayerClassName,
  getMessageEditorTextBlockShellClassName,
  isMessageEditorImportablePasteText,
  mergeChangedRoomMessagesIntoEditorMessages,
  resolveMessageEditorPointerAutoScrollDelta,
  shouldIgnoreDocumentSelectionEventTarget,
  shouldStartMessageEditorAtomicBlockSelection,
} from "./MessageEditor";
import { createMessageEditorTextDraft } from "./model/messageEditorTransforms";

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
  it("uses an 80vh frame height by default for standalone document views", () => {
    expect(getMessageEditorFrameClassName()).toBe("h-[80vh] min-h-0 rounded-md");
  });

  it("preserves an explicit frame class override", () => {
    expect(getMessageEditorFrameClassName("h-full rounded-none")).toBe("h-full rounded-none");
  });

  it("uses one shared scroll viewport for cover, header and content", () => {
    expect(getMessageEditorScrollViewportClassName()).toBe("relative min-h-0 flex-1 overflow-auto");
  });

  it("renders command menus as overlays outside the text flow", () => {
    expect(getMessageEditorSlashMenuLayerClassName()).toContain("absolute");
    expect(getMessageEditorSlashMenuLayerClassName()).toContain("top-full");
  });

  it("adds a small gap only between consecutive text blocks", () => {
    expect(getMessageEditorTextBlockShellClassName({
      hasFollowingTextBlock: true,
      isDragging: false,
    })).toContain("mb-2");

    expect(getMessageEditorTextBlockShellClassName({
      hasFollowingTextBlock: false,
      isDragging: false,
    })).not.toContain("mb-2");
  });

  it("默认把远端 patch 保存标记为 message editor 来源", () => {
    expect(getMessageEditorPatchMutationMeta()).toEqual({
      operationCause: "normal",
      sourceSurface: "message_editor",
    });
  });

  it("doc view 远端 patch 保存会标记为 doc_view 来源", () => {
    expect(getMessageEditorPatchMutationMeta("doc_view")).toEqual({
      operationCause: "normal",
      sourceSurface: "doc_view",
    });
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

  it("keeps atomic media and controls out of whitespace selection starts", () => {
    const image = createMockElement({ tagName: "IMG" });
    const button = createMockElement({ tagName: "BUTTON" });
    const handleChild = createMockElement({
      closestSelectors: ["[data-me-block-handle]"],
    });

    expect(shouldStartMessageEditorAtomicBlockSelection(image as unknown as EventTarget)).toBe(false);
    expect(shouldStartMessageEditorAtomicBlockSelection(button as unknown as EventTarget)).toBe(false);
    expect(shouldStartMessageEditorAtomicBlockSelection(handleChild as unknown as EventTarget)).toBe(false);
  });
});

function withRuntimeMessage(
  message: MessageEditorMessage,
  runtime: { messageId?: number; position?: number; tcLocalSyncState?: "optimistic" },
): MessageEditorMessage {
  return Object.assign(message, runtime);
}

describe("messageEditor room message patch", () => {
  it("inserts editor-created blocks without runtime message ids", () => {
    const message = createMessageEditorTextDraft({ content: "new block" });

    const operations = buildRoomMessagePatchOperations([], [message]);

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      op: "insert",
      message: {
        content: "new block",
        position: 1,
      },
      position: 1,
    });
  });

  it("keeps optimistic room messages out of document patches", () => {
    const optimistic = withRuntimeMessage(
      createMessageEditorTextDraft({ content: "pending chat message" }),
      { messageId: -1, position: 1, tcLocalSyncState: "optimistic" },
    );

    const operations = buildRoomMessagePatchOperations([], [optimistic]);

    expect(operations).toEqual([]);
  });

  it("updates persisted messages by message id", () => {
    const baseline = withRuntimeMessage(
      createMessageEditorTextDraft({ content: "alpha" }),
      { messageId: 7, position: 1 },
    );
    const current = withRuntimeMessage(
      createMessageEditorTextDraft({ content: "beta" }),
      { messageId: 7, position: 1 },
    );

    const operations = buildRoomMessagePatchOperations([baseline], [current]);

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      op: "update",
      messageId: 7,
      message: {
        content: "beta",
        position: 1,
      },
      position: 1,
    });
  });

  it("merges changed insert responses back into the original editor block", () => {
    const current = createMessageEditorTextDraft({ content: "local" });
    const operations = buildRoomMessagePatchOperations([], [current]);
    const merged = mergeChangedRoomMessagesIntoEditorMessages({
      changedMessages: [
        {
          content: "local",
          messageId: 33,
          messageType: 1,
          position: 1,
          roomId: 10,
          status: 0,
          syncId: 101,
          userId: 20,
        },
      ],
      currentMessages: [current],
      operations,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(current);
    expect((merged[0] as MessageEditorMessage & { messageId?: number }).messageId).toBe(33);
    expect((merged[0] as MessageEditorMessage & { syncId?: number }).syncId).toBe(101);
  });

  it("removes deleted messages and applies changed update/move responses", () => {
    const deleted = withRuntimeMessage(
      createMessageEditorTextDraft({ content: "delete me" }),
      { messageId: 7, position: 1 },
    );
    const moved = withRuntimeMessage(
      createMessageEditorTextDraft({ content: "move me" }),
      { messageId: 8, position: 2 },
    );

    const merged = mergeChangedRoomMessagesIntoEditorMessages({
      changedMessages: [
        {
          content: "delete me",
          messageId: 7,
          messageType: 1,
          position: 1,
          roomId: 10,
          status: 1,
          syncId: 102,
          userId: 20,
        },
        {
          content: "move me",
          messageId: 8,
          messageType: 1,
          position: 9,
          roomId: 10,
          status: 0,
          syncId: 103,
          userId: 20,
        },
      ],
      currentMessages: [deleted, moved],
      operations: [
        {
          messageId: 7,
          op: "delete",
        },
        {
          messageId: 8,
          op: "move",
          position: 9,
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(moved);
    expect((merged[0] as MessageEditorMessage & { position?: number }).position).toBe(9);
    expect((merged[0] as MessageEditorMessage & { syncId?: number }).syncId).toBe(103);
  });
});

describe("messageEditor slash query", () => {
  it("finds a slash command on any line in the active block", () => {
    expect(extractMessageEditorSlashQuery("前文\n/ h1\n后文")).toBe("h1");
    expect(extractMessageEditorSlashQuery("前文\n   / quote\n后文")).toBe("quote");
    expect(extractMessageEditorSlashQuery("前文\n@ feiyue\n后文")).toBeNull();
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
