import {
  fetchRoomCollectionSync,
  getUserRoomsQueryKey,
  mergeRoomCollectionSync,
} from "@tuanchat/query/spaces";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";

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

const USER_ROOMS_SNAPSHOT_TTL_MS = 10 * 60_000;

type UserRoomsQueryData = ApiResultRoomListResponse & {
  data?: NonNullable<ApiResultRoomListResponse["data"]> & { baseline?: boolean; latestSyncId?: number };
};

export function useUserRoomsQuery(spaceId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const queryClient = useQueryClient();
  const enabled = isAuthenticated && typeof spaceId === "number" && spaceId > 0;
  const resolvedSpaceId = spaceId ?? -1;
  const queryKey = getUserRoomsQueryKey(resolvedSpaceId);
  const snapshotKey = createMobileQuerySnapshotKey(queryKey);
  const query = useQuery<UserRoomsQueryData>({
    enabled,
    queryKey,
    queryFn: async () => {
      const cached = queryClient.getQueryData<UserRoomsQueryData>(queryKey);
      const snapshot = cached === undefined && session?.userId
        ? await readMobileQuerySnapshot<UserRoomsQueryData>(snapshotKey, {
            scope: "rooms",
            userId: session.userId,
          }).catch(() => null)
        : null;
      const current = cached ?? snapshot?.payload;
      const response = await fetchRoomCollectionSync(
        mobileApiClient,
        resolvedSpaceId,
        current?.data?.latestSyncId ?? 0,
      );
      return {
        success: true,
        data: {
          spaceId: response.spaceId ?? resolvedSpaceId,
          rooms: mergeRoomCollectionSync(current?.data?.rooms ?? [], response),
          baseline: response.baseline,
          latestSyncId: response.latestSyncId ?? current?.data?.latestSyncId ?? 0,
        },
      };
    },
    staleTime: 300_000,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: snapshotKey,
    scope: "rooms",
    ttlMs: USER_ROOMS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
