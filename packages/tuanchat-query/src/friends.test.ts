import type { FriendReqResponse } from "@tuanchat/openapi-client/models/FriendReqResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginBlockFriendOptimisticMutation,
  beginDeleteFriendOptimisticMutation,
  beginUnblockFriendOptimisticMutation,
  FRIEND_REQUEST_STATUS_PENDING,
  FRIEND_REQUEST_TYPE_RECEIVED,
  getPendingReceivedFriendRequests,
} from "./friends";
import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";

function createFriendRequest(overrides: Partial<FriendReqResponse>): FriendReqResponse {
  return {
    id: 1,
    fromId: 10008,
    status: FRIEND_REQUEST_STATUS_PENDING,
    toId: 10001,
    type: FRIEND_REQUEST_TYPE_RECEIVED,
    ...overrides,
  };
}

describe("friend query helpers", () => {
  it("只保留待处理且收到的好友请求", () => {
    const requests = [
      createFriendRequest({ id: 1 }),
      createFriendRequest({ id: 2, status: 2 }),
      createFriendRequest({ id: 3, status: 3 }),
      createFriendRequest({ id: 4, type: "sent" }),
      createFriendRequest({ id: 5, type: undefined }),
    ];

    expect(getPendingReceivedFriendRequests(requests)).toEqual([
      createFriendRequest({ id: 1 }),
    ]);
  });

  it("空输入返回空列表", () => {
    expect(getPendingReceivedFriendRequests(null)).toEqual([]);
    expect(getPendingReceivedFriendRequests(undefined)).toEqual([]);
  });

  it("删除、拉黑和解除拉黑即时更新对应列表并支持回滚", async () => {
    const queryClient = new QueryClient();
    const friend = { userId: 7, username: "七" };
    queryClient.setQueryData(["friends", { pageNo: 1 }], [friend, { userId: 8 }]);
    queryClient.setQueryData(["blacklist", { pageNo: 1 }], []);

    const blockTransaction = await beginBlockFriendOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any[]>(["friends", { pageNo: 1 }])).toEqual([{ userId: 8 }]);
    expect(queryClient.getQueryData<any[]>(["blacklist", { pageNo: 1 }])).toEqual([friend]);
    rollbackOptimisticQueryTransaction(queryClient, blockTransaction);
    expect(queryClient.getQueryData<any[]>(["friends", { pageNo: 1 }])).toEqual([friend, { userId: 8 }]);

    queryClient.setQueryData(["blacklist", { pageNo: 1 }], [friend]);
    await beginUnblockFriendOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any[]>(["blacklist", { pageNo: 1 }])).toEqual([]);

    const deleteTransaction = await beginDeleteFriendOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any[]>(["friends", { pageNo: 1 }])).toEqual([{ userId: 8 }]);
    rollbackOptimisticQueryTransaction(queryClient, deleteTransaction);
  });
});
