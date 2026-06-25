import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ApiResultPageBaseRespFriendReqResponse } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespFriendReqResponse";

export const FRIEND_LIST_QUERY_KEY = ["friendList"] as const;
export const FRIEND_REQUEST_PAGE_QUERY_KEY = ["friendRequestPage"] as const;
export const FRIEND_CHECK_QUERY_KEY = ["friendCheck"] as const;

type FriendRequestPageData = ApiResultPageBaseRespFriendReqResponse | undefined;
type FriendRequestPageSnapshot = Array<[QueryKey, FriendRequestPageData]>;

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
  await queryClient.cancelQueries({ queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY });
  const previousData = queryClient.getQueriesData<FriendRequestPageData>({
    queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY,
  });

  queryClient.setQueriesData<FriendRequestPageData>(
    { queryKey: FRIEND_REQUEST_PAGE_QUERY_KEY },
    current => removeFriendRequestFromPageData(current, friendReqId),
  );

  return previousData;
}

export function rollbackFriendRequestPageCaches(
  queryClient: QueryClient,
  snapshot?: FriendRequestPageSnapshot,
): void {
  if (!snapshot) {
    return;
  }

  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
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
