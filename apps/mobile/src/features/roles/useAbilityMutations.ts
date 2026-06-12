import {
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
  useAbilityByRuleAndRoleQuery as useSharedAbilityByRuleAndRoleQuery,
  useRoleAbilityListQuery as useSharedRoleAbilityListQuery,
  useSetRoleAbilityMutation as useSharedSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation as useSharedUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation as useSharedUpdateRoleAbilityByRoleIdMutation,
} from "@tuanchat/query/role-abilities";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const ROLE_ABILITY_SNAPSHOT_TTL_MS = 5 * 60_000;

export function useRoleAbilityListQuery(roleId: number, options?: { enabled?: boolean }) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = (options?.enabled ?? true) && roleId > 0;
  const query = useSharedRoleAbilityListQuery(mobileApiClient, roleId, {
    ...options,
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(roleAbilityListQueryKey(roleId)),
    scope: "role-ability-list",
    ttlMs: ROLE_ABILITY_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}

export function useAbilityByRuleAndRoleQuery(roleId: number, ruleId: number, options?: { enabled?: boolean }) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = (options?.enabled ?? true) && roleId > 0 && ruleId > 0;
  const query = useSharedAbilityByRuleAndRoleQuery(mobileApiClient, roleId, ruleId, {
    ...options,
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(roleAbilityByRuleQueryKey(roleId, ruleId)),
    scope: "role-ability-by-rule",
    ttlMs: ROLE_ABILITY_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}

export function useSetRoleAbilityMutation() {
  return useSharedSetRoleAbilityMutation(mobileApiClient);
}

export function useUpdateRoleAbilityByRoleIdMutation() {
  return useSharedUpdateRoleAbilityByRoleIdMutation(mobileApiClient);
}

export function useUpdateKeyFieldByRoleIdMutation() {
  return useSharedUpdateKeyFieldByRoleIdMutation(mobileApiClient);
}
