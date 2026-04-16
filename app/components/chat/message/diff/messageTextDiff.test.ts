import { describe, expect, it } from "vitest";

import { buildMessageTextDiff } from "@/components/chat/message/diff/messageTextDiff";

function rebuildText(segments: Array<{ text: string }>) {
  return segments.map(segment => segment.text).join("");
}

describe("buildMessageTextDiff", () => {
  it("在文本相同的时候返回无变化 diff", () => {
    const diff = buildMessageTextDiff("同一条消息", "同一条消息");

    expect(diff.hasChanges).toBe(false);
    expect(diff.summary.insertedChars).toBe(0);
    expect(diff.summary.deletedChars).toBe(0);
    expect(rebuildText(diff.beforeSegments)).toBe("同一条消息");
    expect(rebuildText(diff.afterSegments)).toBe("同一条消息");
  });

  it("可以识别英文插入片段", () => {
    const diff = buildMessageTextDiff("hello world", "hello brave world");

    expect(diff.hasChanges).toBe(true);
    expect(rebuildText(diff.beforeSegments)).toBe("hello world");
    expect(rebuildText(diff.afterSegments)).toBe("hello brave world");
    expect(diff.segments.some(segment => segment.kind === "insert" && segment.text.includes("brave"))).toBe(true);
  });

  it("可以识别中文替换时的增删片段", () => {
    const diff = buildMessageTextDiff("你好世界", "你好宇宙");

    expect(diff.hasChanges).toBe(true);
    expect(rebuildText(diff.beforeSegments)).toBe("你好世界");
    expect(rebuildText(diff.afterSegments)).toBe("你好宇宙");
    expect(diff.summary.insertedChars).toBeGreaterThan(0);
    expect(diff.summary.deletedChars).toBeGreaterThan(0);
  });
});
