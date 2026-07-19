import { getRoleAvatarListQueryKey } from "@tuanchat/query/roles";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

import { useIncrementalRoleAvatarsQuery } from "./use-role-collection-sync";

const ROLE_AVATARS_SNAPSHOT_TTL_MS = 24 * 60 * 60_000;

export function useRoleAvatarsQuery(roleId: number | null | undefined) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roleId === "number" && roleId > 0;
  const query = useIncrementalRoleAvatarsQuery(roleId, session?.userId, { enabled });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getRoleAvatarListQueryKey(roleId)),
    scope: "role-avatars",
    ttlMs: ROLE_AVATARS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
