import type { QueryClient } from "@tanstack/react-query";
import type { StateEventExtra } from "@tuanchat/domain/state-event";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import { mergeRoleVarOpSnapshotsIntoEvents } from "@tuanchat/domain/state-runtime";
import {
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "@tuanchat/query/role-abilities";

type ChangedRoleAbilitySnapshot = {
  ability: RoleAbility;
  roleId: number;
  ruleId: number;
};

function normalizeChangedRoleAbility({ ability, roleId, ruleId }: ChangedRoleAbilitySnapshot): RoleAbility {
  return {
    ...ability,
    roleId: ability.roleId ?? roleId,
    ruleId: ability.ruleId ?? ruleId,
  };
}

export function setChangedRoleAbilityCaches(
  queryClient: Pick<QueryClient, "setQueryData">,
  changedAbilities: ChangedRoleAbilitySnapshot[],
) {
  changedAbilities.forEach((snapshot) => {
    const ability = normalizeChangedRoleAbility(snapshot);
    const roleId = ability.roleId;
    const ruleId = ability.ruleId;
    if (!roleId || !ruleId) {
      return;
    }

    queryClient.setQueryData(roleAbilityByRuleQueryKey(roleId, ruleId), ability);
    queryClient.setQueryData<RoleAbility[] | undefined>(
      roleAbilityListQueryKey(roleId),
      (current) => {
        if (!current) {
          return current;
        }
        const hasSameRule = current.some(item => item.ruleId === ruleId);
        return hasSameRule
          ? current.map(item => (item.ruleId === ruleId ? { ...item, ...ability } : item))
          : [...current, ability];
      },
    );
  });
}

export async function refreshChangedRoleAbilityCaches(
  queryClient: Pick<QueryClient, "invalidateQueries" | "setQueryData">,
  changedAbilities: ChangedRoleAbilitySnapshot[],
) {
  setChangedRoleAbilityCaches(queryClient, changedAbilities);
  const touchedRoleIds = Array.from(new Set(changedAbilities.map(item => item.roleId).filter(roleId => roleId > 0)));
  await Promise.all(touchedRoleIds.map(roleId => queryClient.invalidateQueries({ queryKey: roleAbilityListQueryKey(roleId) })));
}

export function mergeStateEventRoleVarSnapshots(
  stateEvent: StateEventExtra,
  roleVarOps: Parameters<typeof mergeRoleVarOpSnapshotsIntoEvents>[1],
): StateEventExtra {
  return {
    ...stateEvent,
    events: mergeRoleVarOpSnapshotsIntoEvents(stateEvent.events, roleVarOps),
  };
}
