import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getFriendsQueryKey,
  useFriendsQuery as useSharedFriendsQuery,
} from "@tuanchat/query/friends";

const FRIENDS_SNAPSHOT_TTL_MS = 5 * 60_000;

export function useFriendsQuery() {
  const { isAuthenticated, session } = useAuthSession();
  const query = useSharedFriendsQuery(mobileApiClient, undefined, {
    enabled: isAuthenticated,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getFriendsQueryKey()),
    scope: "friends",
    ttlMs: FRIENDS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
