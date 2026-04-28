import { invalidateDicerRoleAbilityCache } from "../../app/components/common/dicer/roleAbilityCache";

type QueryInvalidator = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => unknown;
};

export type RoleAbilityCacheTarget = {
  roleId?: number | null;
  ruleId?: number | null;
};

export const ROLE_ABILITY_LIST_QUERY_KEY = "listRoleAbility";
export const ROLE_ABILITY_BY_RULE_QUERY_KEY = "roleAbilityByRule";

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function roleAbilityListQueryKey(roleId?: number | null): readonly unknown[] {
  return isPositiveFiniteNumber(roleId)
    ? [ROLE_ABILITY_LIST_QUERY_KEY, roleId]
    : [ROLE_ABILITY_LIST_QUERY_KEY];
}

export function roleAbilityByRuleQueryKey(roleId?: number | null, ruleId?: number | null): readonly unknown[] {
  if (isPositiveFiniteNumber(roleId) && isPositiveFiniteNumber(ruleId)) {
    return [ROLE_ABILITY_BY_RULE_QUERY_KEY, roleId, ruleId];
  }
  if (isPositiveFiniteNumber(roleId)) {
    return [ROLE_ABILITY_BY_RULE_QUERY_KEY, roleId];
  }
  return [ROLE_ABILITY_BY_RULE_QUERY_KEY];
}

export function invalidateRoleAbilityCaches(
  queryClient: QueryInvalidator,
  target: RoleAbilityCacheTarget = {},
): Promise<unknown[]> {
  const roleId = isPositiveFiniteNumber(target.roleId) ? target.roleId : undefined;
  const ruleId = isPositiveFiniteNumber(target.ruleId) ? target.ruleId : undefined;

  invalidateDicerRoleAbilityCache({ roleId, ruleId });

  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(roleId) }),
    queryClient.invalidateQueries({ queryKey: roleAbilityByRuleQueryKey(roleId, ruleId) }),
  ]);
}
