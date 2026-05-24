import { describe, expect, it, vi } from "vitest";

import { applyManagedTextStyleInsert } from "./textStyleToolbar";

describe("textStyleToolbar managed insert", () => {
  it("routes selected text through the managed insert handler", () => {
    const onInsertText = vi.fn();

    const handled = applyManagedTextStyleInsert({
      onInsertText,
      selectedText: "正文",
      text: "[正文](style=font-weight:bold)",
    });

    expect(handled).toBe(true);
    expect(onInsertText).toHaveBeenCalledWith("[正文](style=font-weight:bold)", "正文", undefined);
  });

  it("falls back to DOM insertion when the managed handler declines", () => {
    const onInsertText = vi.fn(() => false);

    const handled = applyManagedTextStyleInsert({
      onInsertText,
      selectedText: "正文",
      text: "[正文](style=font-weight:bold)",
    });

    expect(handled).toBe(false);
  });

  it("keeps empty selections on the DOM insertion path", () => {
    const onInsertText = vi.fn();

    const handled = applyManagedTextStyleInsert({
      onInsertText,
      selectedText: "   ",
      text: "[正文](style=font-weight:bold)",
    });

    expect(handled).toBe(false);
    expect(onInsertText).not.toHaveBeenCalled();
  });
});
