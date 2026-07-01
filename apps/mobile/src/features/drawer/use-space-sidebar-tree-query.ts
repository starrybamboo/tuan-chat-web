import {
  getSpaceSidebarTreeQueryKey,
  useGetSpaceSidebarTreeQuery as useSharedGetSpaceSidebarTreeQuery,
} from "@tuanchat/query/sidebar-tree";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const SPACE_SIDEBAR_TREE_SNAPSHOT_TTL_MS = 10 * 60_000;

export function useSpaceSidebarTreeQuery(spaceId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof spaceId === "number" && spaceId > 0;
  const query = useSharedGetSpaceSidebarTreeQuery(mobileApiClient, spaceId ?? -1, {
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getSpaceSidebarTreeQueryKey(spaceId ?? -1)),
    scope: "space-sidebar-tree",
    ttlMs: SPACE_SIDEBAR_TREE_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
