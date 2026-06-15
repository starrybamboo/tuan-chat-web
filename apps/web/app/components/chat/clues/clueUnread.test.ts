import { describe, expect, it } from "vitest";

import {
  buildClueFolderExtraValue,
  CLUE_FOLDER_EXTRA_KEY,
} from "./clueRooms";
import {
  formatUnreadBadgeCount,
  getVisibleClueFolderUnreadCount,
} from "./clueUnread";

function room(params: {
  extra?: unknown;
  roomId: number;
  spaceId?: number;
}) {
  return {
    roomId: params.roomId,
    spaceId: params.spaceId ?? 1,
    extra: typeof params.extra === "string" ? params.extra : JSON.stringify(params.extra ?? {}),
  };
}

describe("clueUnread", () => {
  it("只汇总当前用户可见线索房间的未读数", () => {
    const privateForCurrent = room({
      roomId: 2,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1001, scope: "private" }) },
    });
    const privateForOther = room({
      roomId: 3,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1002, scope: "private" }) },
    });
    const publicRoom = room({
      roomId: 4,
      extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ scope: "public" }) },
    });
    const normalRoom = room({ roomId: 5 });

    expect(getVisibleClueFolderUnreadCount({
      currentUserId: 1001,
      rooms: [privateForCurrent, privateForOther, publicRoom, normalRoom],
      spaceId: 1,
      unreadMessagesNumber: {
        2: 3,
        3: 7,
        4: 2,
        5: 11,
      },
    })).toBe(5);
  });

  it("只汇总目标空间内的线索房间", () => {
    expect(getVisibleClueFolderUnreadCount({
      currentUserId: 1001,
      rooms: [
        room({
          roomId: 2,
          spaceId: 1,
          extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1001, scope: "private" }) },
        }),
        room({
          roomId: 3,
          spaceId: 2,
          extra: { [CLUE_FOLDER_EXTRA_KEY]: buildClueFolderExtraValue({ ownerUserId: 1001, scope: "private" }) },
        }),
      ],
      spaceId: 1,
      unreadMessagesNumber: {
        2: 3,
        3: 4,
      },
    })).toBe(3);
  });

  it("格式化 badge 数字时会限制超大计数", () => {
    expect(formatUnreadBadgeCount(0)).toBe("0");
    expect(formatUnreadBadgeCount(9)).toBe("9");
    expect(formatUnreadBadgeCount(100)).toBe("99+");
  });
});
