import { describe, expect, it } from "vitest";

import {
  getMessageEditorFrameClassName,
  getMessageEditorScrollViewportClassName,
  shouldIgnoreDocumentSelectionEventTarget,
} from "./MessageEditor";

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
  it("uses a 50vh frame height by default for standalone document views", () => {
    expect(getMessageEditorFrameClassName()).toBe("h-[50vh] min-h-0 rounded-md");
  });

  it("preserves an explicit frame class override", () => {
    expect(getMessageEditorFrameClassName("h-full rounded-none")).toBe("h-full rounded-none");
  });

  it("uses one shared scroll viewport for cover, header and content", () => {
    expect(getMessageEditorScrollViewportClassName()).toBe("relative min-h-0 flex-1 overflow-auto");
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
