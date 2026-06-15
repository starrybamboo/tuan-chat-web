import { getDeletedUserRolesPageQueryKey, useDeletedUserRolesPageQuery as useSharedDeletedUserRolesPageQuery } from "@tuanchat/query/roles";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const ROLE_TRASH_SNAPSHOT_TTL_MS = 2 * 60_000;

export function useRoleTrashQuery(roleName?: string) {
  const { isAuthenticated, session } = useAuthSession();
  const userId = session?.userId ?? -1;
  const normalizedRoleName = roleName?.trim() ?? "";
  const params = {
    pageNo: 1,
    pageSize: 100,
    roleName: normalizedRoleName || undefined,
    userId,
  };
  const enabled = isAuthenticated && userId > 0;
  const query = useSharedDeletedUserRolesPageQuery(mobileApiClient, params, {
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getDeletedUserRolesPageQueryKey(params)),
    scope: "role-trash",
    ttlMs: ROLE_TRASH_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
