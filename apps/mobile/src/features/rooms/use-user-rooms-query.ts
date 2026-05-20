import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getUserRoomsQueryKey,
  useGetUserRoomsQuery as useSharedGetUserRoomsQuery,
} from "@tuanchat/query/spaces";

const USER_ROOMS_SNAPSHOT_TTL_MS = 10 * 60_000;

export function useUserRoomsQuery(spaceId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof spaceId === "number" && spaceId > 0;
  const query = useSharedGetUserRoomsQuery(mobileApiClient, spaceId ?? -1, {
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getUserRoomsQueryKey(spaceId ?? -1)),
    scope: "rooms",
    ttlMs: USER_ROOMS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
