import { describe, expect, it } from "vitest";

import { buildPrivateChatTimelineEntries, formatPrivateChatDateLabel } from "./privateChatTimeline";

describe("privateChatTimeline", () => {
  it("会把今天和昨天格式化成常见聊天分割标签", () => {
    const now = new Date("2026-05-22T12:00:00+08:00");

    expect(formatPrivateChatDateLabel("2026-05-22T08:00:00+08:00", now)).toBe("今天");
    expect(formatPrivateChatDateLabel("2026-05-21T08:00:00+08:00", now)).toBe("昨天");
    expect(formatPrivateChatDateLabel("2026-05-20T08:00:00+08:00", now)).toBe("2026年5月20日");
  });

  it("会在跨天且间隔足够长时插入日期分割线", () => {
    const entries = buildPrivateChatTimelineEntries([
      { messageId: 1, createTime: "2026-05-21T08:00:00+08:00" },
      { messageId: 2, createTime: "2026-05-21T18:00:00+08:00" },
      { messageId: 3, createTime: "2026-05-22T06:30:00+08:00" },
      { messageId: 4, createTime: "2026-05-22T08:30:00+08:00" },
    ], new Date("2026-05-22T12:00:00+08:00"));

    expect(entries).toEqual([
      { type: "message", message: { messageId: 1, createTime: "2026-05-21T08:00:00+08:00" }, messageIndex: 0 },
      { type: "message", message: { messageId: 2, createTime: "2026-05-21T18:00:00+08:00" }, messageIndex: 1 },
      { type: "date-divider", label: "今天" },
      { type: "message", message: { messageId: 3, createTime: "2026-05-22T06:30:00+08:00" }, messageIndex: 2 },
      { type: "message", message: { messageId: 4, createTime: "2026-05-22T08:30:00+08:00" }, messageIndex: 3 },
    ]);
  });

  it("跨天但间隔过短时不插入日期分割线", () => {
    const entries = buildPrivateChatTimelineEntries([
      { messageId: 1, createTime: "2026-05-21T23:50:00+08:00" },
      { messageId: 2, createTime: "2026-05-22T00:10:00+08:00" },
    ], new Date("2026-05-22T12:00:00+08:00"));

    expect(entries).toEqual([
      { type: "message", message: { messageId: 1, createTime: "2026-05-21T23:50:00+08:00" }, messageIndex: 0 },
      { type: "message", message: { messageId: 2, createTime: "2026-05-22T00:10:00+08:00" }, messageIndex: 1 },
    ]);
  });

  it("遇到无效时间不会插入分割线", () => {
    const entries = buildPrivateChatTimelineEntries([
      { messageId: 1, createTime: "invalid" },
      { messageId: 2, createTime: "2026-05-22T08:30:00+08:00" },
    ], new Date("2026-05-22T12:00:00+08:00"));

    expect(entries).toEqual([
      { type: "message", message: { messageId: 1, createTime: "invalid" }, messageIndex: 0 },
      { type: "message", message: { messageId: 2, createTime: "2026-05-22T08:30:00+08:00" }, messageIndex: 1 },
    ]);
  });
});
