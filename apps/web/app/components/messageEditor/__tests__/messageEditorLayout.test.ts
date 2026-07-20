import { describe, expect, it } from "vitest";

import {
  getMessageEditorMediaFrameClassName,
  MESSAGE_EDITOR_BLOCK_WIDTH_CLASS,
  MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS,
} from "../messageEditorLayout";

describe("messageEditorLayout", () => {
  it("reserves the speaker handle gutter when the editor container narrows", () => {
    expect(MESSAGE_EDITOR_BLOCK_WIDTH_CLASS).toContain("w-[calc(100%_-_7.5rem)]");
    expect(MESSAGE_EDITOR_BLOCK_WIDTH_CLASS).toContain("left-5");
  });

  it("uses half width and a quiet border for images without a saved width", () => {
    const className = getMessageEditorMediaFrameClassName({
      hasCustomWidth: false,
      isImage: true,
    });

    expect(MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS).toBe("w-1/2 max-w-full");
    expect(className).toContain(MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS);
    expect(className).toContain("border-base-300/60");
  });

  it("preserves custom image widths and the existing full-width video default", () => {
    expect(getMessageEditorMediaFrameClassName({
      hasCustomWidth: true,
      isImage: true,
    })).not.toContain("w-1/2");
    expect(getMessageEditorMediaFrameClassName({
      hasCustomWidth: false,
      isImage: false,
    })).not.toContain("w-1/2");
  });
});
