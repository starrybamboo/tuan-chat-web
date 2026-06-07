import { describe, expect, it } from "vitest";

import { getLatestIncomingSync, getUnreadMessageCountForMessages } from "./privateUnreadUtils";

describe("privateUnreadUtils", () => {
  it("只统计对方在已读线之后的有效消息", () => {
    const messages = [
      { senderId: 42, messageType: 1, syncId: 9 },
      { senderId: 7, messageType: 10000, syncId: 10 },
      { senderId: 42, messageType: 1, syncId: 11 },
      { senderId: 42, messageType: 1, syncId: 12 },
      { senderId: 7, messageType: 1, syncId: 13 },
    ];

    expect(getUnreadMessageCountForMessages(messages, 42, 7, 0)).toBe(2);
  });

  it("会使用乐观已读位置覆盖旧已读线", () => {
    const messages = [
      { senderId: 7, messageType: 10000, syncId: 10 },
      { senderId: 42, messageType: 1, syncId: 11 },
      { senderId: 42, messageType: 1, syncId: 12 },
    ];

    expect(getUnreadMessageCountForMessages(messages, 42, 7, 12)).toBe(0);
  });

  it("只取当前联系人的最新来信 syncId", () => {
    const messages = [
      { senderId: 99, messageType: 1, syncId: 30 },
      { senderId: 42, messageType: 10000, syncId: 31 },
      { senderId: 42, messageType: 1, syncId: 32 },
      { senderId: 42, messageType: 1, syncId: 35 },
    ];

    expect(getLatestIncomingSync(messages, 42)).toBe(35);
  });
});
