import type { AbilityByRuleFieldUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleFieldUpdateRequest";
import type { AbilityByRuleUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleUpdateRequest";
import type { AbilitySetRequest } from "@tuanchat/openapi-client/models/AbilitySetRequest";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import type { QueryClient } from "@tanstack/react-query";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

import type { OptimisticQueryTransaction } from "./optimistic-cache";

type AbilityClient = Pick<TuanChat, "abilityController">;

export const ROLE_ABILITY_BY_RULE_QUERY_KEY = "roleAbilityByRule";
export const ROLE_ABILITY_LIST_QUERY_KEY = "listRoleAbility";
export const ROLE_ABILITIES_BATCH_BY_RULE_QUERY_KEY = "roleAbilitiesBatchByRule";
const ROLE_ABILITY_BATCH_SIZE = 100;

type RoleAbilityMutationKind = "set" | "update" | "field";
type RoleAbilityMutationRequest = AbilitySetRequest | AbilityByRuleUpdateRequest | AbilityByRuleFieldUpdateRequest;
type RoleAbilitySectionKey = "act" | "basic" | "ability" | "skill" | "extra";
type RoleAbilityFieldRequestKey = "actFields" | "basicFields" | "abilityFields" | "skillFields" | "extraFields";

const ROLE_ABILITY_SECTIONS: readonly RoleAbilitySectionKey[] = ["act", "basic", "ability", "skill", "extra"];
const ROLE_ABILITY_FIELD_SECTIONS: readonly [RoleAbilityFieldRequestKey, RoleAbilitySectionKey][] = [
  ["actFields", "act"],
  ["basicFields", "basic"],
  ["abilityFields", "ability"],
  ["skillFields", "skill"],
  ["extraFields", "extra"],
];

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

export function roleAbilitiesBatchByRuleQueryKey(ruleId?: number | null): readonly unknown[] {
  return typeof ruleId === "number" && ruleId > 0
    ? [ROLE_ABILITIES_BATCH_BY_RULE_QUERY_KEY, ruleId]
    : [ROLE_ABILITIES_BATCH_BY_RULE_QUERY_KEY];
}

export function getRoleAbilityByRuleQueryKey(roleId: number, ruleId: number) {
  return ["roleAbilityByRule", roleId, ruleId] as const;
}

function mergeRoleAbilitySection(
  current: Record<string, string> | undefined,
  patch: Record<string, string> | undefined,
) {
  if (!patch || Object.keys(patch).length === 0) {
    return current;
  }
  return { ...(current ?? {}), ...patch };
}

function patchRoleAbilityFieldNames(
  current: Record<string, string> | undefined,
  fields: Record<string, string> | undefined,
) {
  if (!fields || Object.keys(fields).length === 0) {
    return current;
  }

  const next = { ...(current ?? {}) };
  for (const [oldKey, newKey] of Object.entries(fields)) {
    if (newKey == null) {
      delete next[oldKey];
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(next, oldKey)) {
      continue;
    }
    const value = next[oldKey];
    delete next[oldKey];
    next[newKey] = value;
  }
  return next;
}

/** 将能力创建请求转换为可即时展示的缓存数据。 */
export function applyRoleAbilitySetToCache(current: RoleAbility | null | undefined, request: AbilitySetRequest): RoleAbility {
  return {
    ...(current ?? {}),
    ...request,
    roleId: request.roleId,
    ruleId: request.ruleId,
  };
}

/** 按后端 JSONB 合并语义，把局部能力更新合并到现有缓存。 */
export function applyRoleAbilityUpdateToCache(
  current: RoleAbility | null | undefined,
  request: AbilityByRuleUpdateRequest,
): RoleAbility | null | undefined {
  if (!current) {
    return current;
  }

  const next: RoleAbility = { ...current, roleId: request.roleId, ruleId: request.ruleId };
  for (const section of ROLE_ABILITY_SECTIONS) {
    next[section] = mergeRoleAbilitySection(current[section], request[section]);
  }
  return next;
}

/** 按后端字段接口语义，在缓存中同步重命名或删除键。 */
export function applyRoleAbilityFieldUpdateToCache(
  current: RoleAbility | null | undefined,
  request: AbilityByRuleFieldUpdateRequest,
): RoleAbility | null | undefined {
  if (!current) {
    return current;
  }

  const next: RoleAbility = { ...current, roleId: request.roleId, ruleId: request.ruleId };
  for (const [requestKey, section] of ROLE_ABILITY_FIELD_SECTIONS) {
    next[section] = patchRoleAbilityFieldNames(current[section], request[requestKey]);
  }
  return next;
}

function applyRoleAbilityMutationToCache(
  current: RoleAbility | null | undefined,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
) {
  if (kind === "set") {
    return applyRoleAbilitySetToCache(current, request as AbilitySetRequest);
  }
  if (kind === "update") {
    return applyRoleAbilityUpdateToCache(current, request as AbilityByRuleUpdateRequest);
  }
  return applyRoleAbilityFieldUpdateToCache(current, request as AbilityByRuleFieldUpdateRequest);
}

function updateRoleAbilityList(
  current: RoleAbility[] | undefined,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
) {
  if (!current) {
    return current;
  }

  const index = current.findIndex(item => item.roleId === request.roleId && item.ruleId === request.ruleId);
  if (index < 0) {
    return kind === "set"
      ? [...current, applyRoleAbilitySetToCache(undefined, request as AbilitySetRequest)]
      : current;
  }

  const patched = applyRoleAbilityMutationToCache(current[index], kind, request);
  if (!patched || patched === current[index]) {
    return current;
  }
  const next = [...current];
  next[index] = patched;
  return next;
}

function updateRoleAbilityBatch(
  current: Record<string, RoleAbility> | undefined,
  queryKey: readonly unknown[],
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
) {
  if (!current) {
    return current;
  }

  const cacheKey = String(request.roleId);
  const existing = current[cacheKey];
  const containsRole = queryKey.slice(2).includes(request.roleId);
  if (!existing && (kind !== "set" || !containsRole)) {
    return current;
  }

  const patched = applyRoleAbilityMutationToCache(existing, kind, request);
  return patched ? { ...current, [cacheKey]: patched } : current;
}

/** 取消相关查询并同步写入单条、列表与批量角色能力缓存。 */
export function beginRoleAbilityOptimisticMutation(
  queryClient: QueryClient,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
): Promise<OptimisticQueryTransaction> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<RoleAbility | null>({
      queryKey: roleAbilityByRuleQueryKey(request.roleId, request.ruleId),
      update: current => applyRoleAbilityMutationToCache(current, kind, request),
    }),
    optimisticQueryPatch<RoleAbility[]>({
      queryKey: roleAbilityListQueryKey(request.roleId),
      update: current => updateRoleAbilityList(current, kind, request),
    }),
    optimisticQueryPatch<Record<string, RoleAbility>>({
      queryKey: roleAbilitiesBatchByRuleQueryKey(request.ruleId),
      exact: false,
      update: (current, queryKey) => updateRoleAbilityBatch(current, queryKey, kind, request),
    }),
  ]);
}

export function rollbackRoleAbilityOptimisticMutation(
  queryClient: QueryClient,
  transaction?: OptimisticQueryTransaction,
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

function invalidateRoleAbilityMutationCaches(queryClient: QueryClient, roleId: number, ruleId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(roleId, ruleId) }),
    queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(roleId) }),
    queryClient.invalidateQueries({ queryKey: roleAbilitiesBatchByRuleQueryKey(ruleId) }),
  ]);
}

export async function fetchRoleAbilitiesByRule(
  client: AbilityClient,
  roleIds: number[],
  ruleId: number,
): Promise<Record<string, RoleAbility>> {
  const normalizedRoleIds = Array.from(new Set(roleIds.filter(roleId => roleId > 0)));
  if (normalizedRoleIds.length === 0 || ruleId <= 0) {
    return {};
  }

  const batches = Array.from(
    { length: Math.ceil(normalizedRoleIds.length / ROLE_ABILITY_BATCH_SIZE) },
    (_, index) => normalizedRoleIds.slice(index * ROLE_ABILITY_BATCH_SIZE, (index + 1) * ROLE_ABILITY_BATCH_SIZE),
  );
  const responses = await Promise.all(batches.map(async (batchRoleIds) => {
    const response = await client.abilityController.batchGetByRuleAndRoles({ roleIds: batchRoleIds, ruleId });
    return readSuccessfulAbilityApiResultData(response, "获取角色能力失败") ?? {};
  }));
  return Object.assign({}, ...responses);
}

export async function fetchRoleAbilitiesByRuleWithCache(
  client: AbilityClient,
  queryClient: QueryClient,
  roleIds: number[],
  ruleId: number,
  options: { staleTime?: number } = {},
): Promise<Map<number, RoleAbility | null>> {
  const staleTime = options.staleTime ?? 60_000;
  const normalizedRoleIds = Array.from(new Set(roleIds.filter(roleId => roleId > 0))).sort((a, b) => a - b);
  const abilityByRoleId = new Map<number, RoleAbility | null>();
  const missingRoleIds: number[] = [];
  const now = Date.now();

  for (const roleId of normalizedRoleIds) {
    const state = queryClient.getQueryState<RoleAbility | null>(roleAbilityByRuleQueryKey(roleId, ruleId));
    if (
      state?.data !== undefined
      && !state.isInvalidated
      && now - state.dataUpdatedAt <= staleTime
    ) {
      abilityByRoleId.set(roleId, state.data);
    }
    else {
      missingRoleIds.push(roleId);
    }
  }

  if (missingRoleIds.length > 0 && ruleId > 0) {
    const fetched = await fetchRoleAbilitiesByRule(client, missingRoleIds, ruleId);
    for (const roleId of missingRoleIds) {
      const ability = fetched[String(roleId)] ?? null;
      queryClient.setQueryData(roleAbilityByRuleQueryKey(roleId, ruleId), ability);
      abilityByRoleId.set(roleId, ability);
    }
  }

  return abilityByRoleId;
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
    queryKey: [...roleAbilitiesBatchByRuleQueryKey(ruleId), ...sortedRoleIds],
    queryFn: async () => {
      if (!ruleId || ruleId <= 0) {
        return {};
      }
      return fetchRoleAbilitiesByRule(client, sortedRoleIds, ruleId);
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
    onMutate: variables => beginRoleAbilityOptimisticMutation(queryClient, "set", variables),
    onError: (_error, _variables, transaction) => rollbackRoleAbilityOptimisticMutation(queryClient, transaction),
    onSettled: (_result, _error, variables) =>
      invalidateRoleAbilityMutationCaches(queryClient, variables.roleId, variables.ruleId),
  });
}

export function useUpdateRoleAbilityByRoleIdMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilityByRuleUpdateRequest) => updateRoleAbilityByRuleWithSuccessGuard(client, req),
    mutationKey: ["updateRoleAbilityByRoleId"],
    onMutate: variables => beginRoleAbilityOptimisticMutation(queryClient, "update", variables),
    onError: (_error, _variables, transaction) => rollbackRoleAbilityOptimisticMutation(queryClient, transaction),
    onSettled: (_result, _error, variables) =>
      invalidateRoleAbilityMutationCaches(queryClient, variables.roleId, variables.ruleId),
  });
}

export function useUpdateKeyFieldByRoleIdMutation(client: AbilityClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AbilityByRuleFieldUpdateRequest) => updateRoleAbilityFieldByRuleWithSuccessGuard(client, req),
    mutationKey: ["updateRoleAbilityFieldByRoleId"],
    onMutate: variables => beginRoleAbilityOptimisticMutation(queryClient, "field", variables),
    onError: (_error, _variables, transaction) => rollbackRoleAbilityOptimisticMutation(queryClient, transaction),
    onSettled: (_result, _error, variables) =>
      invalidateRoleAbilityMutationCaches(queryClient, variables.roleId, variables.ruleId),
  });
}
