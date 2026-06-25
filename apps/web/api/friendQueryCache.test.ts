import type { ApiResultPageBaseRespFriendReqResponse } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespFriendReqResponse";
import type { FriendReqResponse } from "@tuanchat/openapi-client/models/FriendReqResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  FRIEND_CHECK_QUERY_KEY,
  FRIEND_LIST_QUERY_KEY,
  FRIEND_REQUEST_PAGE_QUERY_KEY,
  invalidateAcceptFriendRequestQueries,
  invalidateRejectFriendRequestQueries,
  optimisticRemoveFriendRequestFromPageCaches,
  reconcileFriendRequestPageCaches,
  rollbackFriendRequestPageCaches,
} from "./friendQueryCache";

function friendRequest(id: number): FriendReqResponse {
  return {
    id,
    fromId: 10000 + id,
    status: 1,
    toId: 10001,
    type: "received",
  };
}

function pageData(ids: number[]): ApiResultPageBaseRespFriendReqResponse {
  return {
    success: true,
    data: {
      pageNo: 1,
      pageSize: 50,
      totalRecords: ids.length,
      isLast: true,
      list: ids.map(friendRequest),
    },
  };
}

describe("friendQueryCache", () => {
  it("会乐观移除好友申请并能按快照回滚", async () => {
    const queryClient = new QueryClient();
    const queryKey = [...FRIEND_REQUEST_PAGE_QUERY_KEY, { pageNo: 1, pageSize: 50 }];
    queryClient.setQueryData(queryKey, pageData([11, 12]));

    const snapshot = await optimisticRemoveFriendRequestFromPageCaches(queryClient, 11);

    expect(queryClient.getQueryData<ApiResultPageBaseRespFriendReqResponse>(queryKey)?.data?.list?.map(item => item.id)).toEqual([12]);

    rollbackFriendRequestPageCaches(queryClient, snapshot);

    expect(queryClient.getQueryData<ApiResultPageBaseRespFriendReqResponse>(queryKey)?.data?.list?.map(item => item.id)).toEqual([11, 12]);
  });

  it("成功返回后会再次校准好友申请页缓存", () => {
    const queryClient = new QueryClient();
    const queryKey = [...FRIEND_REQUEST_PAGE_QUERY_KEY, { pageNo: 1, pageSize: 50 }];
    queryClient.setQueryData(queryKey, pageData([21, 22]));

    reconcileFriendRequestPageCaches(queryClient, 21);

    expect(queryClient.getQueryData<ApiResultPageBaseRespFriendReqResponse>(queryKey)?.data?.list?.map(item => item.id)).toEqual([22]);
  });

  it("settled 阶段会按接受/拒绝路径失效相关查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateAcceptFriendRequestQueries(queryClient);
    await invalidateRejectFriendRequestQueries(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FRIEND_LIST_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FRIEND_CHECK_QUERY_KEY });
  });
});
