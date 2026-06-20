import type { AbilityByRuleFieldUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleFieldUpdateRequest";
import type { AbilityByRuleUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleUpdateRequest";
import type { AbilitySetRequest } from "@tuanchat/openapi-client/models/AbilitySetRequest";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

type AbilityClient = Pick<TuanChat, "abilityController">;

export const ROLE_ABILITY_BY_RULE_QUERY_KEY = "roleAbilityByRule";
export const ROLE_ABILITY_LIST_QUERY_KEY = "listRoleAbility";

function getApiResultErrorMessage(result: { errMsg?: string } | null | undefined, fallback: string): string {
  const message = result?.errMsg?.trim();
  return message || fallback;
}

export function assertSuccessfulAbilityApiResult<T extends { success?: boolean; errMsg?: string } | null | undefined>(
  result: T,
  fallback: string,
): NonNullable<T> {
  if (result?.success !== true) {
    throw new Error(getApiResultErrorMessage(result, fallback));
  }
  return result as NonNullable<T>;
}

export function readSuccessfulAbilityApiResultData<T>(
  result: { success?: boolean; errMsg?: string; data?: T | null } | null | undefined,
  fallback: string,
): T | null {
  return assertSuccessfulAbilityApiResult(result, fallback).data ?? null;
}

async function setRoleAbilityWithSuccessGuard(client: AbilityClient, req: AbilitySetRequest) {
  const result = await client.abilityController.setRoleAbility(req);
  return assertSuccessfulAbilityApiResult(result, "创建角色能力失败");
}

async function updateRoleAbilityByRuleWithSuccessGuard(client: AbilityClient, req: AbilityByRuleUpdateRequest) {
  const result = await client.abilityController.updateRoleAbilityByRule(req);
  return assertSuccessfulAbilityApiResult(result, "更新角色能力失败");
}

async function updateRoleAbilityFieldByRuleWithSuccessGuard(client: AbilityClient, req: AbilityByRuleFieldUpdateRequest) {
  const result = await client.abilityController.updateRoleAbilityFieldByRule(req);
  return assertSuccessfulAbilityApiResult(result, "更新角色能力字段失败");
}

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
        const response = await client.abilityController.getRoleAbilityByRule(ruleId, roleId);
        return [String(roleId), readSuccessfulAbilityApiResultData(response, "获取角色能力失败")] as const;
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
      const res = await client.abilityController.getRoleAbilityByRule(ruleId, roleId);
      return readSuccessfulAbilityApiResultData(res, "获取角色能力失败");
    },
    staleTime: options.staleTime ?? 60_000,
    enabled: (options.enabled ?? true) && roleId > 0 && ruleId > 0,
  });
}

export function useSetRoleAbilityMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilitySetRequest) => setRoleAbilityWithSuccessGuard(client, req),
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
    mutationFn: (req: AbilityByRuleUpdateRequest) => updateRoleAbilityByRuleWithSuccessGuard(client, req),
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
    mutationFn: (req: AbilityByRuleFieldUpdateRequest) => updateRoleAbilityFieldByRuleWithSuccessGuard(client, req),
    mutationKey: ["updateRoleAbilityFieldByRoleId"],
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(variables.roleId, variables.ruleId) });
      queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(variables.roleId) });
    },
  });
}
