import { describe, expect, it } from "vitest";

import { EDITABLE_MESSAGE_CONTENT_EDITING_CLASS } from "./editableMessageContent";

describe("editableMessageContent", () => {
  it("消息正文编辑态使用更明显的原灰系背景和黄色光标", () => {
    expect(EDITABLE_MESSAGE_CONTENT_EDITING_CLASS).toContain("bg-base-content/10");
    expect(EDITABLE_MESSAGE_CONTENT_EDITING_CLASS).toContain("caret-warning");
  });
});
