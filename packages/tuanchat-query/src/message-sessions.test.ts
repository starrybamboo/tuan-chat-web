import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  bumpRoomSessionLatestSyncData,
  beginRoomReadPositionOptimisticMutation,
  beginRoomSubscriptionOptimisticMutation,
  getRoomUnreadCountsFromSessions,
  getUserMessageSessionsQueryKey,
  markRoomSessionReadData,
  setRoomSubscriptionData,
} from "./message-sessions";
import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";

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

  it("订阅与退订立即更新会话列表", () => {
    expect(setRoomSubscriptionData(sessionData(), 3, true)?.data?.map(item => item.roomId)).toEqual([1, 2, 3]);
    expect(setRoomSubscriptionData(sessionData(), 1, false)?.data?.map(item => item.roomId)).toEqual([2]);
  });

  it("已读位置和订阅状态使用事务缓存并支持回滚", async () => {
    const queryClient = new QueryClient();
    const original = sessionData();
    queryClient.setQueryData(getUserMessageSessionsQueryKey(), original);

    const readTransaction = await beginRoomReadPositionOptimisticMutation(queryClient, { roomId: 1, syncId: 8 });
    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(getUserMessageSessionsQueryKey())?.data?.[0].lastReadSyncId).toBe(8);
    rollbackOptimisticQueryTransaction(queryClient, readTransaction);
    expect(queryClient.getQueryData(getUserMessageSessionsQueryKey())).toEqual(original);

    const unsubscribeTransaction = await beginRoomSubscriptionOptimisticMutation(queryClient, 1, false);
    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(getUserMessageSessionsQueryKey())?.data?.map(item => item.roomId)).toEqual([2]);
    rollbackOptimisticQueryTransaction(queryClient, unsubscribeTransaction);
    expect(queryClient.getQueryData(getUserMessageSessionsQueryKey())).toEqual(original);
  });
});
