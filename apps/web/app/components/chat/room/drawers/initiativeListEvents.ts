import type { StateEventAtom } from "@/types/stateEvent";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { Initiative } from "./initiativeListTypes";

export function buildImportRoleInitiativeEvents(params: {
  hp?: number | null;
  initiative: number;
  maxHp?: number | null;
  name: string;
  roleId: number;
}): StateEventAtom[] {
  const { hp, initiative, maxHp, roleId } = params;
  const events: StateEventAtom[] = [
    {
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: "initiative",
      op: STATE_EVENT_VAR_OP.SET,
      value: initiative,
    },
  ];
  if (typeof hp === "number") {
    events.push({
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: "hp",
      op: STATE_EVENT_VAR_OP.SET,
      value: hp,
    });
  }
  if (typeof maxHp === "number") {
    events.push({
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: "maxHp",
      op: STATE_EVENT_VAR_OP.SET,
      value: maxHp,
    });
  }
  return events;
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
        key: "maxHp",
        op: STATE_EVENT_VAR_OP.SET,
        value: patch.maxHp,
      });
    }
  }
  return events;
}
