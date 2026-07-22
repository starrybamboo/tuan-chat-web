import { vi } from "vitest";

import { createMessageEditorTextDraft } from "../../model/messageEditorTransforms";
import {
  pickMessageEditorTextHitEntry,
  resolveMessageEditorCharacterOffsetFromPoint,
  resolveMessageEditorDropTarget,
  resolveMessageEditorTextPointFromClientPosition,
  resolveMessageEditorVisibleDropTarget,
} from "../../runtime/messageEditorHitTest";
import { createMessageEditorRegistry } from "../../runtime/messageEditorRegistry";

function createEntry(blockId: string, top: number, bottom: number) {
  return {
    blockId,
    shellRect: {
      bottom,
      left: 0,
      right: 100,
      top,
    },
    textRect: {
      bottom,
      left: 10,
      right: 90,
      top,
    },
  };
}

describe("messageEditorHitTest", () => {
  it("resolves a character offset from text geometry when browser caret APIs are unavailable", () => {
    const rects = [
      { bottom: 20, left: 10, right: 20, top: 10 },
      { bottom: 20, left: 20, right: 30, top: 10 },
      { bottom: 20, left: 30, right: 40, top: 10 },
      { bottom: 40, left: 10, right: 20, top: 30 },
      { bottom: 40, left: 20, right: 30, top: 30 },
    ];

    expect(resolveMessageEditorCharacterOffsetFromPoint({
      clientX: 27,
      clientY: 15,
      getCharacterRect: offset => rects[offset] ?? null,
      length: rects.length,
    })).toBe(2);
    expect(resolveMessageEditorCharacterOffsetFromPoint({
      clientX: 18,
      clientY: 35,
      getCharacterRect: offset => rects[offset] ?? null,
      length: rects.length,
    })).toBe(4);
  });

  it("resolves drag placement from a single directly-hit block", () => {
    const rect = { bottom: 60, left: 0, right: 100, top: 40 };

    expect(resolveMessageEditorDropTarget("block", rect, 49)).toEqual({
      targetBlockId: "block",
      position: "before",
    });
    expect(resolveMessageEditorDropTarget("block", rect, 51)).toEqual({
      targetBlockId: "block",
      position: "after",
    });
  });

  it("resolves drag placement from only the mounted viewport rows", () => {
    const entries = [
      { blockId: "visible-1", rect: { bottom: 30, left: 0, right: 100, top: 10 } },
      { blockId: "visible-2", rect: { bottom: 70, left: 0, right: 100, top: 50 } },
    ];

    expect(resolveMessageEditorVisibleDropTarget(entries, 0)).toEqual({
      targetBlockId: "visible-1",
      position: "before",
    });
    expect(resolveMessageEditorVisibleDropTarget(entries, 39)).toEqual({
      targetBlockId: "visible-1",
      position: "after",
    });
    expect(resolveMessageEditorVisibleDropTarget(entries, 41)).toEqual({
      targetBlockId: "visible-2",
      position: "before",
    });
    expect(resolveMessageEditorVisibleDropTarget(entries, 90)).toEqual({
      targetBlockId: "visible-2",
      position: "after",
    });
  });

  it("reads only the preferred block layout when the block id is already known", () => {
    const firstMessage = createMessageEditorTextDraft({ blockId: "first", content: "first" });
    const secondMessage = createMessageEditorTextDraft({ blockId: "second", content: "second" });
    const firstRect = vi.fn(() => ({ bottom: 30, left: 10, right: 90, top: 10 }));
    const secondRect = vi.fn(() => ({ bottom: 60, left: 10, right: 90, top: 40 }));
    const firstElement = { getBoundingClientRect: firstRect } as unknown as HTMLElement;
    const secondElement = { getBoundingClientRect: secondRect } as unknown as HTMLElement;

    const point = resolveMessageEditorTextPointFromClientPosition({
      blockRefs: new Map([
        ["first", firstElement],
        ["second", secondElement],
      ]),
      blockShellRefs: new Map([
        ["first", firstElement],
        ["second", secondElement],
      ]),
      clientX: 0,
      clientY: 45,
      messages: [firstMessage, secondMessage],
      preferredBlockId: "second",
      registry: createMessageEditorRegistry(),
      root: {} as HTMLElement,
    });

    expect(point).toEqual({ blockId: "second", offset: 0 });
    expect(firstRect).not.toHaveBeenCalled();
    expect(secondRect).toHaveBeenCalledTimes(2);
  });

  it("maps a directly-hit virtual placeholder to the nearest text boundary", () => {
    const message = createMessageEditorTextDraft({ blockId: "deferred", content: "placeholder text" });
    const slot = {
      getBoundingClientRect: () => ({ bottom: 96, left: 0, right: 100, top: 40 }),
    } as unknown as HTMLElement;

    const point = resolveMessageEditorTextPointFromClientPosition({
      blockRefs: new Map(),
      blockShellRefs: new Map(),
      blockSlotRefs: new Map([["deferred", slot]]),
      clientX: 50,
      clientY: 80,
      messages: [message],
      preferredBlockId: "deferred",
      registry: createMessageEditorRegistry(),
      root: {} as HTMLElement,
    });

    expect(point).toEqual({ blockId: "deferred", offset: "placeholder text".length });
  });

  it("uses the block under the vertical hit area", () => {
    const first = createEntry("first", 10, 30);
    const second = createEntry("second", 40, 60);

    expect(pickMessageEditorTextHitEntry([first, second], 45)).toEqual({
      edge: "inside",
      entry: second,
    });
  });

  it("resolves block gaps by the midpoint between neighboring lines", () => {
    const first = createEntry("first", 10, 30);
    const second = createEntry("second", 50, 70);

    expect(pickMessageEditorTextHitEntry([first, second], 39)).toEqual({
      edge: "after",
      entry: first,
    });
    expect(pickMessageEditorTextHitEntry([first, second], 41)).toEqual({
      edge: "before",
      entry: second,
    });
  });

  it("maps outer document space to the nearest text boundary", () => {
    const first = createEntry("first", 10, 30);
    const second = createEntry("second", 50, 70);

    expect(pickMessageEditorTextHitEntry([first, second], 0)).toEqual({
      edge: "before",
      entry: first,
    });
    expect(pickMessageEditorTextHitEntry([first, second], 80)).toEqual({
      edge: "after",
      entry: second,
    });
  });
});
