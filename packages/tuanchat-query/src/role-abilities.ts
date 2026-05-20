import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { AbilityFieldUpdateRequest2 } from "@tuanchat/openapi-client/models/AbilityFieldUpdateRequest2";
import type { AbilitySetRequest } from "@tuanchat/openapi-client/models/AbilitySetRequest";
import type { AbilityUpdateRequest2 } from "@tuanchat/openapi-client/models/AbilityUpdateRequest2";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type AbilityClient = Pick<TuanChat, "abilityController">;

export const ROLE_ABILITY_BY_RULE_QUERY_KEY = "roleAbilityByRule";
export const ROLE_ABILITY_LIST_QUERY_KEY = "listRoleAbility";

export function roleAbilityByRuleQueryKey(roleId?: number | null, ruleId?: number | null): readonly unknown[] {
  if (typeof roleId === "number" && roleId > 0 && typeof ruleId === "number" && ruleId > 0) {
    return [ROLE_ABILITY_BY_RULE_QUERY_KEY, roleId, ruleId];
  }
  if (typeof roleId === "number" && roleId > 0) {
    return [ROLE_ABILITY_BY_RULE_QUERY_KEY, roleId];
  }
  return [ROLE_ABILITY_BY_RULE_QUERY_KEY];
}

export function roleAbilityListQueryKey(roleId?: number | null): readonly unknown[] {
  return typeof roleId === "number" && roleId > 0
    ? [ROLE_ABILITY_LIST_QUERY_KEY, roleId]
    : [ROLE_ABILITY_LIST_QUERY_KEY];
}

export function getRoleAbilityByRuleQueryKey(roleId: number, ruleId: number) {
  return ["roleAbilityByRule", roleId, ruleId] as const;
}

export function useRoleAbilitiesByRule(
  client: AbilityClient,
  roleIds: number[],
  ruleId: number | null | undefined,
  options: { staleTime?: number } = {},
) {
  const queryClient = useQueryClient();
  const sortedRoleIds = useMemo(() => [...roleIds].filter(id => id > 0).sort((a, b) => a - b), [roleIds]);
  const enabled = sortedRoleIds.length > 0 && typeof ruleId === "number" && ruleId > 0;

  const query = useQuery<Record<string, RoleAbility>>({
    queryKey: ["roleAbilitiesBatchByRule", ruleId, ...sortedRoleIds],
    queryFn: async () => {
      if (!ruleId || ruleId <= 0) {
        return {};
      }
      const entries = await Promise.all(sortedRoleIds.map(async (roleId) => {
        const response = await client.abilityController.getByRuleAndRole(ruleId, roleId);
        return [String(roleId), response.data ?? null] as const;
      }));
      return Object.fromEntries(entries.filter((entry): entry is readonly [string, RoleAbility] => Boolean(entry[1])));
    },
    staleTime: options.staleTime ?? 300_000,
    enabled,
  });

  const prevDataRef = useRef(query.data);
  useEffect(() => {
    if (query.data && query.data !== prevDataRef.current && ruleId && ruleId > 0) {
      prevDataRef.current = query.data;
      for (const [roleIdStr, ability] of Object.entries(query.data)) {
        const roleId = Number(roleIdStr);
        queryClient.setQueryData(getRoleAbilityByRuleQueryKey(roleId, ruleId), ability);
      }
    }
  }, [query.data, queryClient, ruleId]);

  const abilityByRoleId = useMemo(() => {
    const next = new Map<number, RoleAbility | null>();
    for (const roleId of roleIds) {
      next.set(roleId, query.data?.[String(roleId)] ?? null);
    }
    return next;
  }, [query.data, roleIds]);

  return {
    abilityByRoleId,
    isLoading: query.isLoading,
    query,
  };
}

export function useRoleAbilityListQuery(
  client: AbilityClient,
  roleId: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery<RoleAbility[]>({
    queryKey: roleAbilityListQueryKey(roleId),
    queryFn: async () => {
      const res = await client.abilityController.listRoleAbility(roleId);
      return res.data ?? [];
    },
    staleTime: 60_000,
    enabled: (options.enabled ?? true) && roleId > 0,
  });
}

export function useAbilityByRuleAndRoleQuery(
  client: AbilityClient,
  roleId: number,
  ruleId: number,
  options: { staleTime?: number; enabled?: boolean } = {},
) {
  return useQuery<RoleAbility | null>({
    queryKey: roleAbilityByRuleQueryKey(roleId, ruleId),
    queryFn: async () => {
      const res = await client.abilityController.getByRuleAndRole(ruleId, roleId);
      return res.data ?? null;
    },
    staleTime: options.staleTime ?? 60_000,
    enabled: (options.enabled ?? true) && roleId > 0 && ruleId > 0,
  });
}

export function useSetRoleAbilityMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilitySetRequest) => client.abilityController.setRoleAbility(req),
    mutationKey: ["setRoleAbility"],
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(variables.roleId, variables.ruleId) });
      queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(variables.roleId) });
    },
  });
}

export function useUpdateRoleAbilityByRoleIdMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilityUpdateRequest2) => client.abilityController.updateRoleAbility1(req),
    mutationKey: ["updateRoleAbilityByRoleId"],
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(variables.roleId, variables.ruleId) });
      queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(variables.roleId) });
    },
  });
}

export function useUpdateKeyFieldByRoleIdMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilityFieldUpdateRequest2) => client.abilityController.updateRoleAbilityField1(req),
    mutationKey: ["updateRoleAbilityFieldByRoleId"],
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(variables.roleId, variables.ruleId) });
      queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(variables.roleId) });
    },
  });
}
