import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getBlacklistQueryKey,
  useBlacklistQuery as useSharedBlacklistQuery,
} from "@tuanchat/query/friends";

const BLACKLIST_SNAPSHOT_TTL_MS = 2 * 60_000;

export function useBlacklistQuery(enabled: boolean) {
  const { isAuthenticated, session } = useAuthSession();
  const queryEnabled = enabled && isAuthenticated;
  const query = useSharedBlacklistQuery(mobileApiClient, queryEnabled);

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled: queryEnabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getBlacklistQueryKey()),
    scope: "blacklist",
    ttlMs: BLACKLIST_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
