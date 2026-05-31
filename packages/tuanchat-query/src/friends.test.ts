import { describe, expect, it } from "vitest";

import type { FriendReqResponse } from "@tuanchat/openapi-client/models/FriendReqResponse";

import {
  FRIEND_REQUEST_STATUS_PENDING,
  FRIEND_REQUEST_TYPE_RECEIVED,
  getPendingReceivedFriendRequests,
} from "./friends";

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
});
