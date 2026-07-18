import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListRoomMember } from "@tuanchat/openapi-client/models/ApiResultListRoomMember";
import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";
import type { LeaderTransferRequest } from "@tuanchat/openapi-client/models/LeaderTransferRequest";
import type { RoomMember } from "@tuanchat/openapi-client/models/RoomMember";
import type { RoomMemberAddRequest } from "@tuanchat/openapi-client/models/RoomMemberAddRequest";
import type { RoomMemberDeleteRequest } from "@tuanchat/openapi-client/models/RoomMemberDeleteRequest";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";
import type { SpaceMemberAddRequest } from "@tuanchat/openapi-client/models/SpaceMemberAddRequest";
import type { SpaceMemberDeleteRequest } from "@tuanchat/openapi-client/models/SpaceMemberDeleteRequest";
import type { SpaceMemberTypeUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMemberTypeUpdateRequest";
import type { OptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";
import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

export const ROOM_MEMBER_LIST_QUERY_KEY = ["getRoomMemberList"] as const;
export const SPACE_MEMBER_LIST_QUERY_KEY = ["getSpaceMemberList"] as const;

/** 单次成员新增的差量上下文，用于并发安全回滚。 */
export type OptimisticMemberAddContext = {
  addedUserIds: number[];
  hadQueryData: boolean;
};

type MemberListResult<TMember> = {
  success: boolean;
  errCode?: number;
  errMsg?: string;
  data?: TMember[];
};

function validUniqueUserIds(userIds: number[]) {
  return [...new Set(userIds.filter(userId => Number.isFinite(userId) && userId > 0))];
}

function appendOptimisticMembers<TMember extends { userId?: number }>(
  current: MemberListResult<TMember> | undefined,
  userIds: number[],
  createMember: (userId: number) => TMember,
) {
  const existingUserIds = new Set(current?.data?.map(member => member.userId) ?? []);
  const addedUserIds = validUniqueUserIds(userIds).filter(userId => !existingUserIds.has(userId));
  if (addedUserIds.length === 0) {
    return { addedUserIds, next: current };
  }

  return {
    addedUserIds,
    next: {
      ...(current ?? { success: true }),
      data: [
        ...(current?.data ?? []),
        ...addedUserIds.map(createMember),
      ],
    },
  };
}

function removeOptimisticMembers<TMember extends { userId?: number }>(
  current: MemberListResult<TMember> | undefined,
  context: OptimisticMemberAddContext,
) {
  if (!current?.data || context.addedUserIds.length === 0) {
    return current;
  }

  const addedUserIds = new Set(context.addedUserIds);
  const data = current.data.filter(member => !addedUserIds.has(member.userId ?? -1));
  if (!context.hadQueryData && data.length === 0) {
    return undefined;
  }
  return data.length === current.data.length ? current : { ...current, data };
}

function removeMembersByUserIds<TMember extends { userId?: number }>(
  current: MemberListResult<TMember> | undefined,
  userIds: number[],
) {
  if (!current?.data) {
    return current;
  }
  const targetUserIds = new Set(validUniqueUserIds(userIds));
  if (targetUserIds.size === 0) {
    return current;
  }
  const data = current.data.filter(member => !targetUserIds.has(member.userId ?? -1));
  return data.length === current.data.length ? current : { ...current, data };
}

/** 将新增房间成员立即写入唯一成员缓存，并返回可并发回滚的增量上下文。 */
export async function optimisticAddRoomMembersQueryCache(
  queryClient: QueryClient,
  request: RoomMemberAddRequest,
): Promise<OptimisticMemberAddContext> {
  const queryKey = getRoomMembersQueryKey(request.roomId);
  await queryClient.cancelQueries({ queryKey });

  const context: OptimisticMemberAddContext = {
    addedUserIds: [],
    hadQueryData: queryClient.getQueryData(queryKey) !== undefined,
  };
  queryClient.setQueryData<ApiResultListRoomMember>(queryKey, (current) => {
    const result = appendOptimisticMembers<RoomMember>(
      current,
      request.userIdList,
      userId => ({ roomId: request.roomId, userId }),
    );
    context.addedUserIds = result.addedUserIds;
    return result.next;
  });
  return context;
}

/** 将新增空间成员立即写入唯一成员缓存，并返回可并发回滚的增量上下文。 */
export async function optimisticAddSpaceMembersQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberAddRequest,
): Promise<OptimisticMemberAddContext> {
  const queryKey = getSpaceMembersQueryKey(request.spaceId);
  await queryClient.cancelQueries({ queryKey });

  const context: OptimisticMemberAddContext = {
    addedUserIds: [],
    hadQueryData: queryClient.getQueryData(queryKey) !== undefined,
  };
  queryClient.setQueryData<ApiResultListSpaceMember>(queryKey, (current) => {
    const result = appendOptimisticMembers<SpaceMember>(
      current,
      request.userIdList,
      userId => ({
        memberType: 3,
        observer: true,
        spaceId: request.spaceId,
        userId,
      }),
    );
    context.addedUserIds = result.addedUserIds;
    return result.next;
  });
  return context;
}

export function rollbackOptimisticRoomMembers(
  queryClient: QueryClient,
  roomId: number,
  context?: OptimisticMemberAddContext,
) {
  if (!context) {
    return;
  }
  const queryKey = getRoomMembersQueryKey(roomId);
  const current = queryClient.getQueryData<ApiResultListRoomMember>(queryKey);
  const next = removeOptimisticMembers(current, context);
  if (next === undefined) {
    queryClient.removeQueries({ queryKey, exact: true });
    return;
  }
  queryClient.setQueryData<ApiResultListRoomMember>(queryKey, next);
}

export function rollbackOptimisticSpaceMembers(
  queryClient: QueryClient,
  spaceId: number,
  context?: OptimisticMemberAddContext,
) {
  if (!context) {
    return;
  }
  const queryKey = getSpaceMembersQueryKey(spaceId);
  const current = queryClient.getQueryData<ApiResultListSpaceMember>(queryKey);
  const next = removeOptimisticMembers(current, context);
  if (next === undefined) {
    queryClient.removeQueries({ queryKey, exact: true });
    return;
  }
  queryClient.setQueryData<ApiResultListSpaceMember>(queryKey, next);
}

/** 从房间成员缓存即时移除成员。 */
export function optimisticRemoveRoomMembersQueryCache(
  queryClient: QueryClient,
  request: RoomMemberDeleteRequest,
): Promise<OptimisticQueryTransaction> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListRoomMember>({
      queryKey: getRoomMembersQueryKey(request.roomId),
      update: current => removeMembersByUserIds(current, request.userIdList),
    }),
  ]);
}

/** 从空间成员缓存即时移除成员。 */
export function optimisticRemoveSpaceMembersQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberDeleteRequest,
): Promise<OptimisticQueryTransaction> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListSpaceMember>({
      queryKey: getSpaceMembersQueryKey(request.spaceId),
      update: current => removeMembersByUserIds(current, request.userIdList),
    }),
  ]);
}

export function rollbackMemberQueryTransaction(
  queryClient: QueryClient,
  transaction?: OptimisticQueryTransaction,
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

type SpaceMemberListSnapshot = ApiResultListSpaceMember | undefined;

function patchSpaceMemberListData(
  oldData: SpaceMemberListSnapshot,
  updater: (member: SpaceMember) => SpaceMember,
): SpaceMemberListSnapshot {
  if (!oldData?.data) {
    return oldData;
  }

  let changed = false;
  const data = oldData.data.map((member) => {
    const nextMember = updater(member);
    changed ||= nextMember !== member;
    return nextMember;
  });
  return changed ? { ...oldData, data } : oldData;
}

export function setSpaceMemberTypeInListData(
  oldData: SpaceMemberListSnapshot,
  uidList: number[],
  memberType: number,
): SpaceMemberListSnapshot {
  const targetUserIds = new Set(validUniqueUserIds(uidList));
  if (targetUserIds.size === 0) {
    return oldData;
  }

  return patchSpaceMemberListData(oldData, (member) => {
    const userId = member.userId ?? -1;
    return targetUserIds.has(userId) && member.memberType !== memberType
      ? { ...member, memberType }
      : member;
  });
}

export async function optimisticSetSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberTypeUpdateRequest,
): Promise<OptimisticQueryTransaction> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListSpaceMember>({
      queryKey: getSpaceMembersQueryKey(request.spaceId),
      update: current => setSpaceMemberTypeInListData(current, request.uidList ?? [], request.memberType),
    }),
  ]);
}

export function rollbackSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  _spaceId: number,
  transaction?: OptimisticQueryTransaction,
): void {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

export function reconcileSpaceMemberTypeQueryCache(
  queryClient: QueryClient,
  request: SpaceMemberTypeUpdateRequest,
): void {
  queryClient.setQueryData<ApiResultListSpaceMember>(
    getSpaceMembersQueryKey(request.spaceId),
    current => setSpaceMemberTypeInListData(current, request.uidList ?? [], request.memberType),
  );
}

export function optimisticTransferSpaceLeaderQueryCache(
  queryClient: QueryClient,
  request: LeaderTransferRequest,
) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListSpaceMember>({
      queryKey: getSpaceMembersQueryKey(request.spaceId),
      update: current => patchSpaceMemberListData(current, (member) => {
        const leader = member.userId === request.newLeaderId;
        return Boolean(member.leader) === leader ? member : { ...member, leader };
      }),
    }),
  ]);
}

export async function invalidateSpaceMemberQueries(queryClient: QueryClient, spaceId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getSpaceMembersQueryKey(spaceId) }),
    queryClient.invalidateQueries({ queryKey: ROOM_MEMBER_LIST_QUERY_KEY }),
  ]);
}

export async function invalidateRoomMemberQueries(queryClient: QueryClient, roomId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getRoomMembersQueryKey(roomId) }),
    queryClient.invalidateQueries({ queryKey: SPACE_MEMBER_LIST_QUERY_KEY }),
  ]);
}
