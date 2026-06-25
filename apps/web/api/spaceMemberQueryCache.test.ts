import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  ROOM_MEMBER_LIST_QUERY_KEY,
  invalidateSpaceMemberTypeQueries,
  optimisticSetSpaceMemberTypeQueryCache,
  reconcileSpaceMemberTypeQueryCache,
  rollbackSpaceMemberTypeQueryCache,
  setSpaceMemberTypeInListData,
  spaceMemberListQueryKey,
} from "./spaceMemberQueryCache";

function memberList(): ApiResultListSpaceMember {
  return {
    success: true,
    data: [
      { userId: 11, memberType: 1 },
      { userId: 12, memberType: 1 },
    ],
  };
}

describe("spaceMemberQueryCache", () => {
  it("会只更新命中的空间成员身份", () => {
    const previous = memberList();
    const patched = setSpaceMemberTypeInListData(previous, [12], 3);

    expect(patched).not.toBe(previous);
    expect(patched?.data).toEqual([
      { userId: 11, memberType: 1 },
      { userId: 12, memberType: 3 },
    ]);
    expect(previous.data?.[1]).toEqual({ userId: 12, memberType: 1 });
  });

  it("会乐观更新空间成员身份并可按快照回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(spaceMemberListQueryKey(7), memberList());

    const previous = await optimisticSetSpaceMemberTypeQueryCache(queryClient, {
      spaceId: 7,
      uidList: [11],
      memberType: 2,
    });

    expect(queryClient.getQueryData<ApiResultListSpaceMember>(spaceMemberListQueryKey(7))?.data?.[0]).toMatchObject({
      userId: 11,
      memberType: 2,
    });

    rollbackSpaceMemberTypeQueryCache(queryClient, 7, previous);

    expect(queryClient.getQueryData<ApiResultListSpaceMember>(spaceMemberListQueryKey(7))?.data?.[0]).toMatchObject({
      userId: 11,
      memberType: 1,
    });
  });

  it("成功返回后会再次校准缓存，并在 settled 失效成员查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(spaceMemberListQueryKey(8), memberList());

    reconcileSpaceMemberTypeQueryCache(queryClient, {
      spaceId: 8,
      uidList: [11, 12],
      memberType: 4,
    });
    await invalidateSpaceMemberTypeQueries(queryClient, 8);

    expect(queryClient.getQueryData<ApiResultListSpaceMember>(spaceMemberListQueryKey(8))?.data?.map(member => member.memberType)).toEqual([4, 4]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: spaceMemberListQueryKey(8) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ROOM_MEMBER_LIST_QUERY_KEY });
  });
});
