import type { AbilityByRuleFieldUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleFieldUpdateRequest";
import type { AbilityByRuleUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleUpdateRequest";
import type { AbilitySetRequest } from "@tuanchat/openapi-client/models/AbilitySetRequest";
import type { ApiResultListRoleAbility } from "@tuanchat/openapi-client/models/ApiResultListRoleAbility";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { QueryClient } from "@tanstack/react-query";
import type { OptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";
import {
  applyRoleAbilityFieldUpdateToCache,
  applyRoleAbilitySetToCache,
  applyRoleAbilityUpdateToCache,
} from "@tuanchat/query/role-abilities";

import type { CachedRoleAbility } from "./roleAbilityCacheData";

import { roleAbilityByRuleQueryKey, roleAbilityListQueryKey } from "./abilityMutationInvalidation";
import { normalizeRoleAbilityCacheData } from "./roleAbilityCacheData";

type RoleAbilityMutationKind = "set" | "update" | "field";
type RoleAbilityMutationRequest = AbilitySetRequest | AbilityByRuleUpdateRequest | AbilityByRuleFieldUpdateRequest;

function applyMutation(
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

function updateRoleAbilityByRuleCache(
  current: CachedRoleAbility | null | undefined,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
) {
  const patched = applyMutation(current, kind, request);
  return patched
    ? normalizeRoleAbilityCacheData(patched, { roleId: request.roleId, ruleId: request.ruleId })
    : patched;
}

function updateRoleAbilityListCache(
  current: ApiResultListRoleAbility | undefined,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
) {
  if (!current?.data) {
    return current;
  }

  const index = current.data.findIndex(item => item.roleId === request.roleId && item.ruleId === request.ruleId);
  if (index < 0) {
    return kind === "set"
      ? { ...current, data: [...current.data, applyRoleAbilitySetToCache(undefined, request as AbilitySetRequest)] }
      : current;
  }

  const patched = applyMutation(current.data[index], kind, request);
  if (!patched || patched === current.data[index]) {
    return current;
  }
  const data = [...current.data];
  data[index] = patched;
  return { ...current, data };
}

/** Web 端能力缓存同时包含详情别名与原始字段，乐观事务统一维护两种形状。 */
export function beginWebRoleAbilityOptimisticMutation(
  queryClient: QueryClient,
  kind: RoleAbilityMutationKind,
  request: RoleAbilityMutationRequest,
): Promise<OptimisticQueryTransaction> {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<CachedRoleAbility | null>({
      queryKey: roleAbilityByRuleQueryKey(request.roleId, request.ruleId),
      update: current => updateRoleAbilityByRuleCache(current, kind, request),
    }),
    optimisticQueryPatch<ApiResultListRoleAbility>({
      queryKey: roleAbilityListQueryKey(request.roleId),
      update: current => updateRoleAbilityListCache(current, kind, request),
    }),
  ]);
}

export function rollbackWebRoleAbilityOptimisticMutation(
  queryClient: QueryClient,
  transaction?: OptimisticQueryTransaction,
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}
