import type { ApiResultListRoomMember } from "@tuanchat/openapi-client/models/ApiResultListRoomMember";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginAddRoomMemberOptimisticMutation,
  getRoomMembersQueryKey,
  getSpaceMembersQueryKey,
} from "./members";
import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";

describe("member query helpers", () => {
  it("从空间成员缓存补全新房间成员并支持回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getSpaceMembersQueryKey(3), {
      success: true,
      data: [{ avatarFileId: 88, spaceId: 3, userId: 7, username: "成员七" }],
    });
    queryClient.setQueryData(getRoomMembersQueryKey(5), {
      success: true,
      data: [{ roomId: 5, userId: 6 }],
    });

    const transaction = await beginAddRoomMemberOptimisticMutation(queryClient, {
      roomId: 5,
      spaceId: 3,
      userId: 7,
    });
    expect(queryClient.getQueryData<ApiResultListRoomMember>(getRoomMembersQueryKey(5))?.data).toEqual([
      { roomId: 5, userId: 6 },
      { avatarFileId: 88, avatarMediaType: undefined, roomId: 5, userId: 7, username: "成员七" },
    ]);

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<ApiResultListRoomMember>(getRoomMembersQueryKey(5))?.data)
      .toEqual([{ roomId: 5, userId: 6 }]);
  });
});
