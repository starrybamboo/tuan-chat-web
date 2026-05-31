import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getFriendRequestsQueryKey,
  getPendingReceivedFriendRequests,
  useFriendRequestsQuery as useSharedFriendRequestsQuery,
} from "@tuanchat/query/friends";

const FRIEND_REQUESTS_SNAPSHOT_TTL_MS = 2 * 60_000;

export function useFriendRequestsQuery() {
  const { isAuthenticated, session } = useAuthSession();
  const query = useSharedFriendRequestsQuery(mobileApiClient, undefined, {
    enabled: isAuthenticated,
  });

  const snapshotQuery = useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getFriendRequestsQueryKey()),
    preparePayload: getPendingReceivedFriendRequests,
    scope: "friend-requests",
    ttlMs: FRIEND_REQUESTS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });

  if (snapshotQuery.data === undefined) {
    return snapshotQuery;
  }

  return {
    ...snapshotQuery,
    data: getPendingReceivedFriendRequests(snapshotQuery.data),
  };
}
