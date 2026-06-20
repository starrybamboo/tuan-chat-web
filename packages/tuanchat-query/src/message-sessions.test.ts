import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";

import { describe, expect, it } from "vitest";

import {
  bumpRoomSessionLatestSyncData,
  getRoomUnreadCountsFromSessions,
  markRoomSessionReadData,
} from "./message-sessions";

function sessionData(): ApiResultListMessageSessionResponse {
  return {
    data: [
      { lastReadSyncId: 3, latestSyncId: 8, roomId: 1 },
      { lastReadSyncId: 10, latestSyncId: 9, roomId: 2 },
    ],
    success: true,
  };
}

describe("message session helpers", () => {
  it("按 latestSyncId 和 lastReadSyncId 计算房间未读", () => {
    expect(getRoomUnreadCountsFromSessions(sessionData().data)).toEqual({
      1: 5,
      2: 0,
    });
  });

  it("标记房间已读时不会回退已读位置", () => {
    expect(markRoomSessionReadData(sessionData(), 1, 6)?.data?.[0].lastReadSyncId).toBe(6);
    expect(markRoomSessionReadData(sessionData(), 1, 2)?.data?.[0].lastReadSyncId).toBe(3);
  });

  it("收到新消息时推进订阅会话 latestSyncId", () => {
    expect(bumpRoomSessionLatestSyncData(sessionData(), 2, 12)?.data?.[1].latestSyncId).toBe(12);
    expect(bumpRoomSessionLatestSyncData(sessionData(), 2, 7)?.data?.[1].latestSyncId).toBe(9);
  });
});
