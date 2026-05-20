import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getRoleAvatarListQueryKey,
  useRoleAvatarsQuery as useSharedRoleAvatarsQuery,
} from "@tuanchat/query/roles";

const ROLE_AVATARS_SNAPSHOT_TTL_MS = 24 * 60 * 60_000;

export function useRoleAvatarsQuery(roleId: number | null | undefined) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roleId === "number" && roleId > 0;
  const query = useSharedRoleAvatarsQuery(mobileApiClient, roleId, {
    enabled,
  });

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
