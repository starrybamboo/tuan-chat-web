import type { QueryClient } from "@tanstack/react-query";
import type { RuleUpdateRequest } from "@tuanchat/openapi-client/models/RuleUpdateRequest";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function patchRuleCacheValue(
  current: unknown,
  ruleId: number,
  update: (rule: Record<string, unknown>) => Record<string, unknown> | null,
): unknown {
  if (Array.isArray(current)) {
    let changed = false;
    const next = current.flatMap((item) => {
      const patched = isRecord(item) && item.ruleId === ruleId
        ? update(item)
        : patchRuleCacheValue(item, ruleId, update);
      changed ||= patched !== item;
      return patched === null ? [] : [patched];
    });
    return changed ? next : current;
  }
  if (!isRecord(current)) {
    return current;
  }
  if (current.ruleId === ruleId) {
    return update(current);
  }
  let next = current;
  for (const key of ["data", "list", "pages"] as const) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    const patched = patchRuleCacheValue(current[key], ruleId, update);
    if (patched !== current[key]) {
      next = { ...next, [key]: patched };
    }
  }
  return next;
}

function beginRuleMutation(
  queryClient: QueryClient,
  ruleId: number,
  update: (rule: Record<string, unknown>) => Record<string, unknown> | null,
) {
  const prefixes = [["getRuleDetail"], ["getRulePage"], ["rules"], ["ruleList"], ["ruleDetail"], ["allRuleList"]] as const;
  return beginOptimisticQueryTransaction(queryClient, prefixes.map(queryKey => optimisticQueryPatch<unknown>({
    queryKey,
    exact: false,
    update: current => patchRuleCacheValue(current, ruleId, update),
  })));
}

export function beginRuleUpdateOptimisticMutation(queryClient: QueryClient, request: RuleUpdateRequest) {
  return beginRuleMutation(queryClient, request.ruleId, rule => ({ ...rule, ...request }));
}

export function beginRuleDeleteOptimisticMutation(queryClient: QueryClient, ruleId: number) {
  return beginRuleMutation(queryClient, ruleId, () => null);
}

export function rollbackRuleOptimisticMutation(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}
