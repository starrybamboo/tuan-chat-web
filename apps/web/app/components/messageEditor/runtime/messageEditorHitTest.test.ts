import { pickMessageEditorTextHitEntry } from "./messageEditorHitTest";

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
