import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { mobileApiClient } from "@/lib/api";

export function getRoleAbilityByRuleQueryKey(roleId: number, ruleId: number) {
  return ["roleAbilityByRule", roleId, ruleId] as const;
}

/**
 * 批量读取角色在指定规则下的能力数据。
 */
export function useRoleAbilitiesByRule(roleIds: number[], ruleId: number | null | undefined) {
  const queries = useQueries({
    queries: roleIds.map(roleId => ({
      queryKey: getRoleAbilityByRuleQueryKey(roleId, ruleId ?? -1),
      queryFn: async () => {
        if (!ruleId || ruleId <= 0) {
          return null;
        }
        const response = await mobileApiClient.abilityController.getByRuleAndRole(ruleId, roleId);
        return response.data ?? null;
      },
      enabled: roleId > 0 && typeof ruleId === "number" && ruleId > 0,
      staleTime: 300_000,
    })),
  });

  const abilityByRoleId = useMemo(() => {
    const next = new Map<number, RoleAbility | null>();
    roleIds.forEach((roleId, index) => {
      next.set(roleId, queries[index]?.data ?? null);
    });
    return next;
  }, [queries, roleIds]);

  return {
    abilityByRoleId,
    isLoading: queries.some(query => query.isLoading),
    queries,
  };
}
