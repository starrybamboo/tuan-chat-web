import {
  fetchSpaceCollectionSync,
  getUserActiveSpacesQueryKey,
  mergeSpaceCollectionSync,
} from "@tuanchat/query/spaces";
import type { ApiResultListSpace } from "@tuanchat/openapi-client/models/ApiResultListSpace";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  readMobileQuerySnapshot,
} from "@/lib/mobile-query-snapshot-cache";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const ACTIVE_SPACES_SNAPSHOT_TTL_MS = 10 * 60_000;

type ActiveSpacesQueryData = ApiResultListSpace & { latestSyncId?: number };

export function useUserActiveSpacesQuery() {
  const { isAuthenticated, session } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = getUserActiveSpacesQueryKey();
  const snapshotKey = createMobileQuerySnapshotKey(queryKey);
  const query = useQuery<ActiveSpacesQueryData>({
    enabled: isAuthenticated,
    queryKey,
    queryFn: async () => {
      const cached = queryClient.getQueryData<ActiveSpacesQueryData>(queryKey);
      const snapshot = cached === undefined && session?.userId
        ? await readMobileQuerySnapshot<ActiveSpacesQueryData>(snapshotKey, {
            scope: "spaces",
            userId: session.userId,
          }).catch(() => null)
        : null;
      const current = cached ?? snapshot?.payload;
      const response = await fetchSpaceCollectionSync(mobileApiClient, current?.latestSyncId ?? 0);
      return {
        success: true,
        data: mergeSpaceCollectionSync(current?.data ?? [], response, true),
        latestSyncId: response.latestSyncId ?? current?.latestSyncId ?? 0,
      };
    },
    staleTime: 300_000,
  });
  const snapshotEnabled = canUseMobileUserScopedSnapshot({
    isAuthenticated,
    userId: session?.userId,
  });

  return useMobileQuerySnapshot(query, {
    enabled: snapshotEnabled,
    key: snapshotKey,
    scope: "spaces",
    ttlMs: ACTIVE_SPACES_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
