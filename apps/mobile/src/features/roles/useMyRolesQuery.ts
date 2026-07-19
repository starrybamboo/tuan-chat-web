import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { getUserRolesByTypesQueryKey } from "@tuanchat/query/room-roles";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

import { useIncrementalUserRolesQuery } from "./use-role-collection-sync";

const MY_ROLES_SNAPSHOT_TTL_MS = 10 * 60_000;
const MY_ROLE_TYPES = [0, 1] as const;

export function useMyRolesQuery(userId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof userId === "number" && userId > 0;
  const query = useIncrementalUserRolesQuery(userId, MY_ROLE_TYPES, {
    enabled,
  }) as ReturnType<typeof useIncrementalUserRolesQuery> & { data?: UserRole[] };

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
