import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  ROOM_SESSION_QUERY_KEY,
  USER_SESSIONS_QUERY_KEY,
  invalidateRoomSessionQueries,
  optimisticRemoveRoomSessionQueryCache,
  optimisticUpsertRoomSessionQueryCache,
  reconcileRemovedRoomSessionQueryCache,
  reconcileUpsertedRoomSessionQueryCache,
  rollbackUserSessionsQueryCache,
} from "./messageSessionQueryCache";

function sessions(roomIds: number[]): ApiResultListMessageSessionResponse {
  return {
    success: true,
    data: roomIds.map(roomId => ({
      roomId,
      lastReadSyncId: roomId * 10,
      latestSyncId: roomId * 10 + 1,
    })),
  };
}

describe("messageSessionQueryCache", () => {
  it("会乐观移除房间会话并可回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, sessions([1, 2]));

    const transaction = await optimisticRemoveRoomSessionQueryCache(queryClient, 1);

    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY)?.data?.map(item => item.roomId)).toEqual([2]);

    rollbackUserSessionsQueryCache(queryClient, transaction);

    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY)?.data?.map(item => item.roomId)).toEqual([1, 2]);
  });

  it("订阅房间会乐观新增并用服务端会话校准", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, sessions([1]));

    await optimisticUpsertRoomSessionQueryCache(queryClient, 2);

    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY)?.data?.map(item => item.roomId)).toEqual([1, 2]);

    reconcileUpsertedRoomSessionQueryCache(queryClient, 2, {
      roomId: 2,
      lastReadSyncId: 88,
      latestSyncId: 99,
      lastMessageContent: "server",
    });

    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY)?.data?.find(item => item.roomId === 2)).toMatchObject({
      roomId: 2,
      lastReadSyncId: 88,
      latestSyncId: 99,
      lastMessageContent: "server",
    });
  });

  it("取消订阅成功后会再次校准删除结果，并在 settled 失效会话查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, sessions([3, 4]));

    reconcileRemovedRoomSessionQueryCache(queryClient, 3);
    await invalidateRoomSessionQueries(queryClient);

    expect(queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY)?.data?.map(item => item.roomId)).toEqual([4]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: USER_SESSIONS_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ROOM_SESSION_QUERY_KEY });
  });
});
