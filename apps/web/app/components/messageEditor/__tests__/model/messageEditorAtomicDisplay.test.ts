import { describe, expect, it } from "vitest";

import { resolveMessageEditorGenericBlockText } from "../../model/messageEditorAtomicDisplay";

describe("messageEditor atomic display", () => {
  it("uses the message content as a document paragraph when generic blocks have text", () => {
    expect(resolveMessageEditorGenericBlockText({
      content: "  状态推进到第二轮  ",
      typeLabel: "状态事件",
    })).toBe("状态推进到第二轮");
  });

  it("uses a single inline placeholder for unsupported generic blocks without text", () => {
    expect(resolveMessageEditorGenericBlockText({
      content: "",
      typeLabel: "转发消息",
    })).toBe("[转发消息]");
  });
});
