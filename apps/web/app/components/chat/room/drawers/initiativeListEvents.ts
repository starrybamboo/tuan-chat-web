import type { StateEventAtom } from "@/types/stateEvent";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { Initiative } from "./initiativeListTypes";

import { HP_MAX_ROLE_VALUE_KEYS } from "./stateDrawerRoleRows";

export function buildImportRoleInitiativeEvents(params: {
  initiative: number;
  name: string;
  roleId: number;
}): StateEventAtom[] {
  const { initiative, roleId } = params;
  return [
    {
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: "initiative",
      op: STATE_EVENT_VAR_OP.SET,
      value: initiative,
    },
  ];
}

export function buildRemoveInitiativeEvents(item: Initiative): StateEventAtom[] {
  if (typeof item.roleId !== "number") {
    return [];
  }
  return [
    {
      type: "varOp",
      scope: buildRoleStateEventScope(item.roleId),
      key: "initiative",
      op: STATE_EVENT_VAR_OP.SET,
      value: 0,
    },
  ];
}

export function buildUpdateInitiativeEvents(
  item: Initiative,
  patch: Partial<Initiative>,
): StateEventAtom[] {
  const events: StateEventAtom[] = [];
  if (typeof item.roleId !== "number") {
    return events;
  }
  if (typeof patch.value === "number") {
    events.push({
      type: "varOp",
      scope: buildRoleStateEventScope(item.roleId),
      key: "initiative",
      op: STATE_EVENT_VAR_OP.SET,
      value: patch.value,
    });
  }

  if ("hp" in patch) {
    if (typeof patch.hp === "number") {
      events.push({
        type: "varOp",
        scope: buildRoleStateEventScope(item.roleId),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: patch.hp,
      });
    }
  }
  if ("maxHp" in patch) {
    if (typeof patch.maxHp === "number") {
      events.push({
        type: "varOp",
        scope: buildRoleStateEventScope(item.roleId),
        key: HP_MAX_ROLE_VALUE_KEYS[0],
        op: STATE_EVENT_VAR_OP.SET,
        value: patch.maxHp,
      });
    }
  }
  return events;
}
