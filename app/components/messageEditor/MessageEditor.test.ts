import { describe, expect, it } from "vitest";

import type { MessageDraft } from "@/types/messageDraft";

import {
  buildRoomMessagePatchOperations,
  getMessageEditorFrameClassName,
  getMessageEditorScrollViewportClassName,
  getMessageEditorSlashMenuLayerClassName,
  getMessageEditorTextBlockShellClassName,
  shouldIgnoreDocumentSelectionEventTarget,
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

  it("renders the slash menu as an overlay outside the text flow", () => {
    expect(getMessageEditorSlashMenuLayerClassName()).toBe("absolute left-3 right-0 top-full z-20 mt-2");
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
});

function withRuntimeMessage(
  message: MessageDraft,
  runtime: { messageId?: number; position?: number; tcLocalSyncState?: "optimistic" },
): MessageDraft {
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

  it("keeps optimistic room-cache messages out of document patches", () => {
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
});
