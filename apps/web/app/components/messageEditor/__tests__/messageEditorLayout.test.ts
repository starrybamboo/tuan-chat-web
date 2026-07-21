import { describe, expect, it } from "vitest";

import {
  MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS,
  getMessageEditorMediaFrameClassName,
  MESSAGE_EDITOR_BLOCK_WIDTH_CLASS,
  MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS,
  MESSAGE_EDITOR_DEFAULT_VIDEO_WIDTH_CLASS,
  MESSAGE_EDITOR_HEADER_CONTENT_WIDTH_CLASS,
} from "../messageEditorLayout";

describe("messageEditorLayout", () => {
  it("reserves the speaker handle gutter when the editor container narrows", () => {
    expect(MESSAGE_EDITOR_BLOCK_WIDTH_CLASS).toContain("w-[calc(100%_-_8rem)]");
    expect(MESSAGE_EDITOR_BLOCK_WIDTH_CLASS).toContain("left-6");
  });

  it("limits the drag frame to the message area after the speaker gutter", () => {
    expect(MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS).toContain("before:left-6");
    expect(MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS).toContain("before:right-0");
  });

  it("aligns the main title with the visible speaker edge", () => {
    expect(MESSAGE_EDITOR_HEADER_CONTENT_WIDTH_CLASS).toBe(
      "mx-auto w-[calc(100%_-_5rem)] max-w-[59rem]",
    );
  });

  it("uses half width and a quiet border for images without a saved width", () => {
    const className = getMessageEditorMediaFrameClassName({
      hasCustomWidth: false,
      isImage: true,
      isVideo: false,
    });

    expect(MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS).toBe("w-1/2 max-w-full");
    expect(className).toContain(MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS);
    expect(className).toContain("border-base-300/60");
  });

  it("uses two-thirds width for videos while preserving persisted media widths", () => {
    expect(getMessageEditorMediaFrameClassName({
      hasCustomWidth: true,
      isImage: true,
      isVideo: false,
    })).not.toContain("w-1/2");
    expect(MESSAGE_EDITOR_DEFAULT_VIDEO_WIDTH_CLASS).toBe("w-2/3 max-w-full");
    expect(getMessageEditorMediaFrameClassName({
      hasCustomWidth: false,
      isImage: false,
      isVideo: true,
    })).toContain(MESSAGE_EDITOR_DEFAULT_VIDEO_WIDTH_CLASS);
    expect(getMessageEditorMediaFrameClassName({
      hasCustomWidth: true,
      isImage: false,
      isVideo: true,
    })).not.toContain("w-2/3");
  });
});
