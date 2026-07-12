import type { ApiResultListRoomMember } from "@tuanchat/openapi-client/models/ApiResultListRoomMember";
import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";

import { QueryClient } from "@tanstack/react-query";
import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";
import { describe, expect, it, vi } from "vitest";

import {
  ROOM_MEMBER_LIST_QUERY_KEY,
  invalidateSpaceMemberQueries,
  optimisticAddRoomMembersQueryCache,
  optimisticAddSpaceMembersQueryCache,
  optimisticRemoveRoomMembersQueryCache,
  optimisticSetSpaceMemberTypeQueryCache,
  reconcileSpaceMemberTypeQueryCache,
  rollbackMemberQueryTransaction,
  rollbackOptimisticRoomMembers,
  rollbackOptimisticSpaceMembers,
  rollbackSpaceMemberTypeQueryCache,
  setSpaceMemberTypeInListData,
} from "./memberQueryCache";

function spaceMemberList(): ApiResultListSpaceMember {
  return {
    success: true,
    data: [
      { userId: 11, memberType: 1 },
      { userId: 12, memberType: 1 },
    ],
  };
}

describe("memberQueryCache", () => {
  it("乐观添加房间成员并仅回滚本次新增用户", async () => {
    const queryClient = new QueryClient();
    const queryKey = getRoomMembersQueryKey(12);
    queryClient.setQueryData<ApiResultListRoomMember>(queryKey, {
      success: true,
      data: [{ roomId: 12, userId: 1, username: "原成员" }],
    });

    const context = await optimisticAddRoomMembersQueryCache(queryClient, {
      roomId: 12,
      userIdList: [1, 2, 2],
    });

    expect(context).toEqual({ addedUserIds: [2], hadQueryData: true });
    expect(queryClient.getQueryData<ApiResultListRoomMember>(queryKey)?.data?.map(member => member.userId))
      .toEqual([1, 2]);

    queryClient.setQueryData<ApiResultListRoomMember>(queryKey, current => ({
      ...current!,
      data: [...(current?.data ?? []), { roomId: 12, userId: 3 }],
    }));
    rollbackOptimisticRoomMembers(queryClient, 12, context);

    expect(queryClient.getQueryData<ApiResultListRoomMember>(queryKey)?.data?.map(member => member.userId))
      .toEqual([1, 3]);
  });

  it("无缓存时创建空间观战成员占位并在失败后清理", async () => {
    const queryClient = new QueryClient();
    const queryKey = getSpaceMembersQueryKey(7);

    const context = await optimisticAddSpaceMembersQueryCache(queryClient, {
      spaceId: 7,
      userIdList: [8],
    });

    expect(context).toEqual({ addedUserIds: [8], hadQueryData: false });
    expect(queryClient.getQueryData<ApiResultListSpaceMember>(queryKey)).toEqual({
      success: true,
      data: [{ memberType: 3, observer: true, spaceId: 7, userId: 8 }],
    });

    rollbackOptimisticSpaceMembers(queryClient, 7, context);
    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
  });

  it("乐观移除房间成员并可通过统一事务回滚", async () => {
    const queryClient = new QueryClient();
    const queryKey = getRoomMembersQueryKey(12);
    queryClient.setQueryData<ApiResultListRoomMember>(queryKey, {
      success: true,
      data: [{ userId: 1 }, { userId: 2 }],
    });

    const transaction = await optimisticRemoveRoomMembersQueryCache(queryClient, {
      roomId: 12,
      userIdList: [1],
    });
    expect(queryClient.getQueryData<ApiResultListRoomMember>(queryKey)?.data?.map(member => member.userId))
      .toEqual([2]);

    rollbackMemberQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<ApiResultListRoomMember>(queryKey)?.data?.map(member => member.userId))
      .toEqual([1, 2]);
  });

  it("只更新命中的空间成员身份", () => {
    const previous = spaceMemberList();
    const patched = setSpaceMemberTypeInListData(previous, [12], 3);

    expect(patched).not.toBe(previous);
    expect(patched?.data).toEqual([
      { userId: 11, memberType: 1 },
      { userId: 12, memberType: 3 },
    ]);
    expect(previous.data?.[1]).toEqual({ userId: 12, memberType: 1 });
  });

  it("乐观更新空间成员身份并可按快照回滚", async () => {
    const queryClient = new QueryClient();
    const queryKey = getSpaceMembersQueryKey(7);
    queryClient.setQueryData(queryKey, spaceMemberList());

    const previous = await optimisticSetSpaceMemberTypeQueryCache(queryClient, {
      spaceId: 7,
      uidList: [11],
      memberType: 2,
    });
    expect(queryClient.getQueryData<ApiResultListSpaceMember>(queryKey)?.data?.[0]).toMatchObject({
      userId: 11,
      memberType: 2,
    });

    rollbackSpaceMemberTypeQueryCache(queryClient, 7, previous);
    expect(queryClient.getQueryData<ApiResultListSpaceMember>(queryKey)?.data?.[0]).toMatchObject({
      userId: 11,
      memberType: 1,
    });
  });

  it("成功返回后校准缓存并统一失效成员查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const queryKey = getSpaceMembersQueryKey(8);
    queryClient.setQueryData(queryKey, spaceMemberList());

    reconcileSpaceMemberTypeQueryCache(queryClient, {
      spaceId: 8,
      uidList: [11, 12],
      memberType: 4,
    });
    await invalidateSpaceMemberQueries(queryClient, 8);

    expect(queryClient.getQueryData<ApiResultListSpaceMember>(queryKey)?.data?.map(member => member.memberType))
      .toEqual([4, 4]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ROOM_MEMBER_LIST_QUERY_KEY });
  });
});
