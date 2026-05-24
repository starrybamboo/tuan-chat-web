import { describe, expect, it, vi } from "vitest";

import {
  findScrollableElement,
  resolveWheelScrollDelta,
  shouldBlockBrowserShortcut,
} from "./browserShortcutGuard";

type ScrollableElementLike = {
  clientHeight: number;
  clientWidth: number;
  dataset?: { chatFrameRoot?: string; chatFrameScroller?: string };
  parentElement: ScrollableElementLike | null;
  querySelector?: (selector: string) => ScrollableElementLike | null;
  scrollBy: ReturnType<typeof vi.fn>;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
};

function createScrollableElement(overrides: Partial<ScrollableElementLike> = {}): ScrollableElementLike {
  return {
    clientHeight: 200,
    clientWidth: 200,
    dataset: {},
    parentElement: null,
    querySelector: vi.fn(() => null),
    scrollBy: vi.fn(),
    scrollHeight: 400,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 400,
    ...overrides,
  };
}

describe("browserShortcutGuard", () => {
  it("会屏蔽浏览器默认会抢走页面的快捷键", () => {
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: true,
      key: "r",
      metaKey: false,
      shiftKey: false,
    })).toBe(true);
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: true,
      key: "=",
      metaKey: false,
      shiftKey: false,
    })).toBe(true);
    expect(shouldBlockBrowserShortcut({
      altKey: true,
      ctrlKey: false,
      key: "ArrowLeft",
      metaKey: false,
      shiftKey: false,
    })).toBe(true);
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: false,
      key: "F5",
      metaKey: false,
      shiftKey: false,
    })).toBe(true);
  });

  it("不会屏蔽业务快捷键", () => {
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: true,
      key: "Enter",
      metaKey: false,
      shiftKey: false,
    })).toBe(false);
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: true,
      key: "z",
      metaKey: false,
      shiftKey: false,
    })).toBe(false);
    expect(shouldBlockBrowserShortcut({
      altKey: false,
      ctrlKey: false,
      key: "Escape",
      metaKey: false,
      shiftKey: false,
    })).toBe(false);
  });

  it("ctrl 加滚轮只换算为滚动量，不做页面缩放", () => {
    expect(resolveWheelScrollDelta({ deltaMode: 0, deltaX: 0, deltaY: 120 }, 720)).toEqual({
      left: 0,
      top: 120,
    });
    expect(resolveWheelScrollDelta({ deltaMode: 1, deltaX: 1, deltaY: -2 }, 720)).toEqual({
      left: 16,
      top: -32,
    });
    expect(resolveWheelScrollDelta({ deltaMode: 2, deltaX: 0, deltaY: 1 }, 720)).toEqual({
      left: 0,
      top: 720,
    });
  });

  it("聊天区域内的 Ctrl 滚轮会优先命中 Virtuoso scroller，上下都能滚", () => {
    const scroller = createScrollableElement({
      scrollTop: 40,
      scrollHeight: 640,
      clientHeight: 240,
      dataset: undefined,
      querySelector: vi.fn(() => null),
    });
    const chatRoot = createScrollableElement({
      dataset: { chatFrameRoot: "true" },
      clientHeight: 240,
      scrollHeight: 240,
      scrollTop: 0,
      querySelector: vi.fn((selector: string) => (selector.includes("virtuoso-scroller") ? scroller : null)),
    });
    const overlay = createScrollableElement({
      parentElement: chatRoot,
      dataset: undefined,
      querySelector: vi.fn(() => null),
      scrollHeight: 120,
      clientHeight: 120,
    });

    expect(findScrollableElement(overlay as any, 0, -120, {
      querySelector: vi.fn(() => null),
      scrollingElement: null,
    })).toBe(scroller);
    expect(findScrollableElement(overlay as any, 0, 120, {
      querySelector: vi.fn(() => null),
      scrollingElement: null,
    })).toBe(scroller);
  });

  it("多选浮层成为滚轮目标时，也会回落到标记过的聊天 scroller", () => {
    const scroller = createScrollableElement({
      scrollTop: 120,
      scrollHeight: 800,
      clientHeight: 240,
      dataset: { chatFrameScroller: "true" },
    });
    const selectionToolbar = createScrollableElement({
      scrollHeight: 96,
      clientHeight: 96,
    });
    const documentRef = {
      querySelector: vi.fn((selector: string) => (
        selector.includes("data-chat-frame-scroller") ? scroller : null
      )),
      scrollingElement: null,
    };

    expect(findScrollableElement(selectionToolbar as any, 0, 120, documentRef)).toBe(scroller);
  });

  it("聊天根节点内优先滚动消息列表，避免工具条内部假滚动截住向下滚轮", () => {
    const scroller = createScrollableElement({
      scrollTop: 80,
      scrollHeight: 900,
      clientHeight: 260,
      dataset: { chatFrameScroller: "true" },
    });
    const chatRoot = createScrollableElement({
      dataset: { chatFrameRoot: "true" },
      scrollHeight: 260,
      clientHeight: 260,
      querySelector: vi.fn((selector: string) => (
        selector.includes("data-chat-frame-scroller") ? scroller : null
      )),
    });
    const toolbarInner = createScrollableElement({
      parentElement: chatRoot,
      scrollTop: 0,
      scrollHeight: 90,
      clientHeight: 48,
    });

    expect(findScrollableElement(toolbarInner as any, 0, 120, {
      querySelector: vi.fn(() => null),
      scrollingElement: null,
    })).toBe(scroller);
  });
});
