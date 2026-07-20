import { describe, expect, it } from "vitest";

import { MESSAGE_EDITOR_BLOCK_WIDTH_CLASS } from "../messageEditorLayout";

describe("messageEditorLayout", () => {
  it("reserves the speaker handle gutter when the editor container narrows", () => {
    expect(MESSAGE_EDITOR_BLOCK_WIDTH_CLASS).toContain("w-[calc(100%_-_5rem)]");
  });
});
