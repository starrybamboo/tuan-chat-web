import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { isGroupRoomMessageReminderEnabled } from "./webSocketNotificationPolicy";

describe("webSocketNotificationPolicy", () => {
  it("会在会话缓存未加载时保留群聊消息提醒", () => {
    const queryClient = new QueryClient();

    expect(isGroupRoomMessageReminderEnabled(queryClient, 11)).toBe(true);
  });

  it("会根据 getUserSessions 缓存判断房间消息提醒是否开启", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserSessions"], {
      success: true,
      data: [
        { roomId: 11, latestSyncId: 8, lastReadSyncId: 8 },
        { roomId: 12, latestSyncId: 3, lastReadSyncId: 1 },
      ],
    });

    expect(isGroupRoomMessageReminderEnabled(queryClient, 11)).toBe(true);
    expect(isGroupRoomMessageReminderEnabled(queryClient, 13)).toBe(false);
  });

  it("会拒绝非法房间 ID，避免误弹提醒", () => {
    const queryClient = new QueryClient();

    expect(isGroupRoomMessageReminderEnabled(queryClient, 0)).toBe(false);
    expect(isGroupRoomMessageReminderEnabled(queryClient, Number.NaN)).toBe(false);
  });
});
