import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getUserRolesByTypesQueryKey,
  useUserRolesByTypesQuery,
} from "@tuanchat/query/room-roles";

const MY_ROLES_SNAPSHOT_TTL_MS = 10 * 60_000;
const MY_ROLE_TYPES = [0, 1] as const;

export function useMyRolesQuery(userId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof userId === "number" && userId > 0;
  const query = useUserRolesByTypesQuery(mobileApiClient, userId, MY_ROLE_TYPES, {
    enabled,
    staleTime: 60_000,
  }) as ReturnType<typeof useUserRolesByTypesQuery> & { data?: UserRole[] };

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getUserRolesByTypesQueryKey(userId, MY_ROLE_TYPES)),
    scope: "my-roles",
    ttlMs: MY_ROLES_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
