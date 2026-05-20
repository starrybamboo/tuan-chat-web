import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getSpaceMembersQueryKey,
  useGetSpaceMembersQuery as useSharedGetSpaceMembersQuery,
} from "@tuanchat/query/members";

const SPACE_MEMBERS_SNAPSHOT_TTL_MS = 5 * 60_000;

export function useSpaceMembersQuery(spaceId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof spaceId === "number" && spaceId > 0;
  const query = useSharedGetSpaceMembersQuery(mobileApiClient, spaceId ?? -1, {
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getSpaceMembersQueryKey(spaceId ?? -1)),
    scope: "space-members",
    ttlMs: SPACE_MEMBERS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
