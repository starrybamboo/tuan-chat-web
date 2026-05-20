import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getUserStickersQueryKey,
  useUserStickersQuery as useSharedUserStickersQuery,
} from "@tuanchat/query/stickers";

const USER_STICKERS_SNAPSHOT_TTL_MS = 10 * 60_000;

/**
 * 获取当前用户的表情包列表。
 */
export function useUserStickersQuery(enabled = true) {
  const { isAuthenticated, session } = useAuthSession();
  const queryEnabled = enabled && isAuthenticated;
  const query = useSharedUserStickersQuery(mobileApiClient, { enabled: queryEnabled });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled: queryEnabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getUserStickersQueryKey()),
    scope: "stickers",
    ttlMs: USER_STICKERS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
