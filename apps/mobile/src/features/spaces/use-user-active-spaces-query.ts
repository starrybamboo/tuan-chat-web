import {
  getUserActiveSpacesQueryKey,
  useGetUserActiveSpacesQuery as useSharedGetUserActiveSpacesQuery,
} from "@tuanchat/query/spaces";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const ACTIVE_SPACES_SNAPSHOT_TTL_MS = 10 * 60_000;

export function useUserActiveSpacesQuery() {
  const { isAuthenticated, session } = useAuthSession();
  const query = useSharedGetUserActiveSpacesQuery(mobileApiClient, {
    enabled: isAuthenticated,
  });
  const snapshotEnabled = canUseMobileUserScopedSnapshot({
    isAuthenticated,
    userId: session?.userId,
  });

  return useMobileQuerySnapshot(query, {
    enabled: snapshotEnabled,
    key: createMobileQuerySnapshotKey(getUserActiveSpacesQueryKey()),
    scope: "spaces",
    ttlMs: ACTIVE_SPACES_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
