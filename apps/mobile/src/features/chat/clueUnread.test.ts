import { buildClueFolderExtraValue, CLUE_FOLDER_EXTRA_KEY } from "@tuanchat/domain/clue-folder";
import { describe, expect, it } from "vitest";

import {
  formatClueUnreadAccessibilityLabel,
  formatUnreadBadgeCount,
  getVisibleClueFolderUnreadCount,
} from "./clueUnread";

function clueExtra(params: Parameters<typeof buildClueFolderExtraValue>[0]) {
  return {
    [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue(params),
  };
}

describe("mobile clueUnread", () => {
  it("格式化未读角标并限制最大展示值", () => {
    expect(formatUnreadBadgeCount(0)).toBe("0");
    expect(formatUnreadBadgeCount(8)).toBe("8");
    expect(formatUnreadBadgeCount(128)).toBe("99+");
  });

  it("格式化线索 tab 未读读屏文案", () => {
    expect(formatClueUnreadAccessibilityLabel(0)).toBe("线索，暂无未读");
    expect(formatClueUnreadAccessibilityLabel(1)).toBe("线索，1 条未读");
    expect(formatClueUnreadAccessibilityLabel(99)).toBe("线索，99 条未读");
    expect(formatClueUnreadAccessibilityLabel(128)).toBe("线索，99 条以上未读");
  });

  it("只统计当前空间内可见线索房间的未读", () => {
    const rooms = [
      {
        roomId: 10,
        spaceId: 1,
        extra: clueExtra({
          ownerUserId: 7,
          scope: "private",
        }),
      },
      {
        roomId: 11,
        spaceId: 1,
        extra: clueExtra({
          scope: "public",
        }),
      },
      {
        roomId: 12,
        spaceId: 2,
        extra: clueExtra({
          scope: "public",
        }),
      },
      {
        roomId: 13,
        spaceId: 1,
        extra: clueExtra({
          ownerUserId: 8,
          scope: "private",
        }),
      },
      {
        roomId: 14,
        spaceId: 1,
      },
    ];

    expect(getVisibleClueFolderUnreadCount({
      currentUserId: 7,
      rooms,
      spaceId: 1,
      unreadMessagesNumber: {
        10: 2,
        11: 3,
        12: 5,
        13: 7,
        14: 11,
      },
    })).toBe(5);
  });
});
