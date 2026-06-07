import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import {
  getRoleAbilityByRuleQueryKey,
  useRoleAbilitiesByRule as useSharedRoleAbilitiesByRule,
} from "@tuanchat/query/role-abilities";
import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const ROLE_ABILITIES_BY_RULE_SNAPSHOT_TTL_MS = 5 * 60_000;

/**
 * 批量读取角色在指定规则下的能力数据。
 */
export function useRoleAbilitiesByRule(roleIds: number[], ruleId: number | null | undefined) {
  const { isAuthenticated, session } = useAuthSession();
  const sortedRoleIds = useMemo(() => [...roleIds].filter(id => id > 0).sort((a, b) => a - b), [roleIds]);
  const enabled = isAuthenticated && sortedRoleIds.length > 0 && typeof ruleId === "number" && ruleId > 0;
  const result = useSharedRoleAbilitiesByRule(mobileApiClient, roleIds, ruleId);
  const snapshotQuery = useMobileQuerySnapshot<Record<string, RoleAbility>, typeof result.query>(
    result.query,
    {
      enabled: canUseMobileUserScopedSnapshot({
        enabled,
        isAuthenticated,
        userId: session?.userId,
      }),
      key: createMobileQuerySnapshotKey(["roleAbilitiesBatchByRule", ruleId ?? null, ...sortedRoleIds]),
      scope: "role-abilities-by-rule",
      ttlMs: ROLE_ABILITIES_BY_RULE_SNAPSHOT_TTL_MS,
      userId: session?.userId,
    },
  );

  const abilityByRoleId = useMemo(() => {
    const next = new Map<number, RoleAbility | null>();
    for (const roleId of roleIds) {
      next.set(roleId, snapshotQuery.data?.[String(roleId)] ?? null);
    }
    return next;
  }, [snapshotQuery.data, roleIds]);

  return {
    ...result,
    abilityByRoleId,
    isLoading: snapshotQuery.isLoading,
    query: snapshotQuery,
  };
}

export { getRoleAbilityByRuleQueryKey };
