import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type AbilityClient = Pick<TuanChat, "abilityController">;

export function getRoleAbilityByRuleQueryKey(roleId: number, ruleId: number) {
  return ["roleAbilityByRule", roleId, ruleId] as const;
}

export function useRoleAbilitiesByRule(
  client: AbilityClient,
  roleIds: number[],
  ruleId: number | null | undefined,
  options: { staleTime?: number } = {},
) {
  const queries = useQueries({
    queries: roleIds.map(roleId => ({
      enabled: roleId > 0 && typeof ruleId === "number" && ruleId > 0,
      queryFn: async () => {
        if (!ruleId || ruleId <= 0) {
          return null;
        }
        const response = await client.abilityController.getByRuleAndRole(ruleId, roleId);
        return response.data ?? null;
      },
      queryKey: getRoleAbilityByRuleQueryKey(roleId, ruleId ?? -1),
      staleTime: options.staleTime ?? 300_000,
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
