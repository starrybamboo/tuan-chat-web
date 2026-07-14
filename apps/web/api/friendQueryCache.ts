import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultFriendCheckResponse } from "@tuanchat/openapi-client/models/ApiResultFriendCheckResponse";
import type { ApiResultListFriendResponse } from "@tuanchat/openapi-client/models/ApiResultListFriendResponse";
import type { ApiResultPageBaseRespFriendReqResponse } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespFriendReqResponse";
import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { OptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

export const FRIEND_LIST_QUERY_KEY = ["friendList"] as const;
export const FRIEND_BLACK_LIST_QUERY_KEY = ["friendBlackList"] as const;
export const FRIEND_REQUEST_PAGE_QUERY_KEY = ["friendRequestPage"] as const;
export const FRIEND_CHECK_QUERY_KEY = ["friendCheck"] as const;

type FriendRequestPageData = ApiResultPageBaseRespFriendReqResponse | undefined;
type FriendRequestPageSnapshot = OptimisticQueryTransaction;

function removeFriendFromResult(current: ApiResultListFriendResponse | undefined, targetUserId: number) {
  if (!current?.data) {
    return current;
  }
  const data = current.data.filter(friend => friend.userId !== targetUserId);
  return data.length === current.data.length ? current : { ...current, data };
}

function addFriendToResult(current: ApiResultListFriendResponse | undefined, friend?: FriendResponse) {
  if (!current?.data || !friend?.userId || current.data.some(item => item.userId === friend.userId)) {
    return current;
  }
  return { ...current, data: [...current.data, friend] };
}

function findFriendInListCaches(queryClient: QueryClient, targetUserId: number) {
  for (const [, current] of queryClient.getQueriesData<ApiResultListFriendResponse>({ queryKey: FRIEND_LIST_QUERY_KEY })) {
    const friend = current?.data?.find(item => item.userId === targetUserId);
    if (friend) {
      return friend;
    }
  }
  return undefined;
}

function patchFriendCheckResult(
  current: ApiResultFriendCheckResponse | undefined,
  patch: NonNullable<ApiResultFriendCheckResponse["data"]>,
) {
  return current?.data ? { ...current, data: { ...current.data, ...patch } } : current;
}

export function beginDeleteFriendRelationshipOptimisticMutation(queryClient: QueryClient, targetUserId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListFriendResponse>({
      queryKey: FRIEND_LIST_QUERY_KEY,
      exact: false,
      update: current => removeFriendFromResult(current, targetUserId),
    }),
    optimisticQueryPatch<ApiResultFriendCheckResponse>({
      queryKey: [...FRIEND_CHECK_QUERY_KEY, targetUserId],
      update: current => patchFriendCheckResult(current, { canSendMessage: false, isFriend: false }),
    }),
  ]);
}

export function beginBlockFriendRelationshipOptimisticMutation(queryClient: QueryClient, targetUserId: number) {
  const friend = findFriendInListCaches(queryClient, targetUserId);
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListFriendResponse>({
      queryKey: FRIEND_LIST_QUERY_KEY,
      exact: false,
      update: current => removeFriendFromResult(current, targetUserId),
    }),
    optimisticQueryPatch<ApiResultListFriendResponse>({
      queryKey: FRIEND_BLACK_LIST_QUERY_KEY,
      exact: false,
      update: current => addFriendToResult(current, friend),
    }),
    optimisticQueryPatch<ApiResultFriendCheckResponse>({
      queryKey: [...FRIEND_CHECK_QUERY_KEY, targetUserId],
      update: current => patchFriendCheckResult(current, { canSendMessage: false, isFriend: false, status: 3 }),
    }),
  ]);
}

export function beginUnblockFriendRelationshipOptimisticMutation(queryClient: QueryClient, targetUserId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListFriendResponse>({
      queryKey: FRIEND_BLACK_LIST_QUERY_KEY,
      exact: false,
      update: current => removeFriendFromResult(current, targetUserId),
    }),
    optimisticQueryPatch<ApiResultFriendCheckResponse>({
      queryKey: [...FRIEND_CHECK_QUERY_KEY, targetUserId],
      update: current => patchFriendCheckResult(current, { canSendMessage: false, isFriend: false }),
    }),
  ]);
}

export function rollbackFriendRelationshipOptimisticMutation(
  queryClient: QueryClient,
  transaction?: OptimisticQueryTransaction,
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

function removeFriendRequestFromPageData(
  current: FriendRequestPageData,
  friendReqId: number,
): FriendRequestPageData {
  if (!current?.data?.list) {
    return current;
  }

  const nextList = current.data.list.filter(request => request?.id !== friendReqId);
  if (nextList.length === current.data.list.length) {
    return current;
  }

  return {
    ...current,
    data: {
      ...current.data,
      list: nextList,
    },
  };
}

export async function optimisticRemoveFriendRequestFromPageCaches(
  queryClient: QueryClient,
  friendReqId: number,
): Promise<FriendRequestPageSnapshot> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<FriendRequestPageData>({
      queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY,
      exact: false,
      update: current => removeFriendRequestFromPageData(current, friendReqId),
    }),
  ]);
}

export function rollbackFriendRequestPageCaches(
  queryClient: QueryClient,
  snapshot?: FriendRequestPageSnapshot,
): void {
  rollbackOptimisticQueryTransaction(queryClient, snapshot);
}

export function reconcileFriendRequestPageCaches(
  queryClient: QueryClient,
  friendReqId: number,
): void {
  queryClient.setQueriesData<FriendRequestPageData>(
    { queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY },
    current => removeFriendRequestFromPageData(current, friendReqId),
  );
}

export async function invalidateAcceptFriendRequestQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: FRIEND_LIST_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: FRIEND_CHECK_QUERY_KEY }),
  ]);
}

export async function invalidateRejectFriendRequestQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: FRIEND_CHECK_QUERY_KEY }),
  ]);
}
