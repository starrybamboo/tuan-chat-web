import {
  useAbilityByRuleAndRoleQuery as useSharedAbilityByRuleAndRoleQuery,
  useSetRoleAbilityMutation as useSharedSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation as useSharedUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation as useSharedUpdateRoleAbilityByRoleIdMutation,
} from "@tuanchat/query/role-abilities";

import { mobileApiClient } from "@/lib/api";

export function useAbilityByRuleAndRoleQuery(roleId: number, ruleId: number, options?: { enabled?: boolean }) {
  return useSharedAbilityByRuleAndRoleQuery(mobileApiClient, roleId, ruleId, options);
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
