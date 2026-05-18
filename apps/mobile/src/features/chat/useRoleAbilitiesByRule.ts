import {
  getRoleAbilityByRuleQueryKey,
  useRoleAbilitiesByRule as useSharedRoleAbilitiesByRule,
} from "@tuanchat/query/role-abilities";

import { mobileApiClient } from "@/lib/api";

/**
 * 批量读取角色在指定规则下的能力数据。
 */
export function useRoleAbilitiesByRule(roleIds: number[], ruleId: number | null | undefined) {
  return useSharedRoleAbilitiesByRule(mobileApiClient, roleIds, ruleId);
}

export { getRoleAbilityByRuleQueryKey };
