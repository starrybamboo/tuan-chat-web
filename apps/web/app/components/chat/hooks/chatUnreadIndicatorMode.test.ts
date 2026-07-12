import { describe, expect, it } from "vitest";

import { getPrivateEntryBadgeLoadMode, resolvePrivateEntryBadgeCount } from "./chatUnreadIndicatorMode";

describe("chat unread indicator mode", () => {
  it("群聊模式只加载轻量摘要", () => {
    expect(getPrivateEntryBadgeLoadMode(true, false)).toEqual({
      loadFullPrivateData: false,
      loadSummary: true,
    });
  });

  it("私聊模式加载完整数据并停用摘要", () => {
    expect(getPrivateEntryBadgeLoadMode(true, true)).toEqual({
      loadFullPrivateData: true,
      loadSummary: false,
    });
  });

  it("按当前模式选择角标来源", () => {
    const counts = {
      privateUnreadCount: 4,
      pendingFriendRequestCount: 1,
      summaryDirectUnreadCount: 7,
      summaryPendingFriendRequestCount: 2,
    };
    expect(resolvePrivateEntryBadgeCount({ ...counts, isPrivateChatMode: true })).toBe(5);
    expect(resolvePrivateEntryBadgeCount({ ...counts, isPrivateChatMode: false })).toBe(9);
  });
});
