import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  useAddRoomRoleMutation as useSharedAddRoomRoleMutation,
  useRoomRolesQuery as useSharedRoomRolesQuery,
} from "@tuanchat/query/room-roles";

const ROOM_ROLES_SNAPSHOT_TTL_MS = 5 * 60_000;

export function useRoomRolesQuery(roomId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roomId === "number" && roomId > 0;
  const query = useSharedRoomRolesQuery(mobileApiClient, roomId, {
    enabled,
  });
  const rolesQuery = {
    ...query,
    data: query.data?.allRoles as UserRole[] | undefined,
  };
  const snapshotQuery = useMobileQuerySnapshot(rolesQuery, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(["roomRoles", roomId ?? null]),
    scope: "room-roles",
    ttlMs: ROOM_ROLES_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });

  return {
    ...snapshotQuery,
    data: snapshotQuery.data ?? [],
  };
}

/** 将当前用户选择的角色加入指定房间。 */
export function useAddRoomRoleMutation() {
  return useSharedAddRoomRoleMutation(mobileApiClient);
}
