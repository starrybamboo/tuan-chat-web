import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";
import type { SpaceMemberTypeUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMemberTypeUpdateRequest";

export function spaceMemberListQueryKey(spaceId: number) {
  return ["getSpaceMemberList", spaceId] as const;
}

export const ROOM_MEMBER_LIST_QUERY_KEY = ["getRoomMemberList"] as const;

type SpaceMemberListSnapshot = ApiResultListSpaceMember | undefined;
type SpaceMember = NonNullable<ApiResultListSpaceMember["data"]>[number];

function patchSpaceMemberListData(
  oldData: SpaceMemberListSnapshot,
  updater: (member: SpaceMember) => SpaceMember,
): SpaceMemberListSnapshot {
  if (!oldData?.data) {
    return oldData;
  }

  let changed = false;
  const nextMembers = oldData.data.map((member) => {
    const nextMember = updater(member);
    if (nextMember !== member) {
      changed = true;
    }
    return nextMember;
  });

  if (!changed) {
    return oldData;
  }

  return {
    ...oldData,
    data: nextMembers,
  };
}

export function setSpaceMemberTypeInListData(
  oldData: SpaceMemberListSnapshot,
  uidList: number[],
  memberType: number,
): SpaceMemberListSnapshot {
  const targetUserIds = new Set(uidList.filter(uid => Number.isFinite(uid) && uid > 0));
  if (targetUserIds.size === 0) {
    return oldData;
  }

  return patchSpaceMemberListData(oldData, (member) => {
    const userId = member.userId ?? -1;
    if (!targetUserIds.has(userId) || member.memberType === memberType) {
      return member;
    }

    return {
      ...member,
      memberType,
    };
  });
}

export async function optimisticSetSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberTypeUpdateRequest,
): Promise<SpaceMemberListSnapshot> {
  const queryKey = spaceMemberListQueryKey(request.spaceId);
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<ApiResultListSpaceMember>(queryKey);
  queryClient.setQueryData<ApiResultListSpaceMember>(
    queryKey,
    current => setSpaceMemberTypeInListData(current, request.uidList ?? [], request.memberType),
  );
  return previous;
}

export function rollbackSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  spaceId: number,
  previous?: SpaceMemberListSnapshot,
): void {
  if (previous) {
    queryClient.setQueryData(spaceMemberListQueryKey(spaceId), previous);
    return;
  }
  queryClient.invalidateQueries({ queryKey: spaceMemberListQueryKey(spaceId) });
}

export function reconcileSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberTypeUpdateRequest,
): void {
  queryClient.setQueryData<ApiResultListSpaceMember>(
    spaceMemberListQueryKey(request.spaceId),
    current => setSpaceMemberTypeInListData(current, request.uidList ?? [], request.memberType),
  );
}

export async function invalidateSpaceMemberTypeQueries(
  queryClient: QueryClient,
  spaceId: number,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: spaceMemberListQueryKey(spaceId) }),
    queryClient.invalidateQueries({ queryKey: ROOM_MEMBER_LIST_QUERY_KEY }),
  ]);
}
