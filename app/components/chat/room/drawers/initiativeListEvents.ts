import type { StateEventAtom, StateEventCombatValue } from "@/types/stateEvent";

import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import type { Initiative, InitiativeParam } from "./initiativeListTypes";

export function normalizeCombatValue(value: string): StateEventCombatValue {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : trimmed;
}

export function buildInitiativeOrderSetAtom(items: Initiative[]): StateEventAtom {
  const participantIds = [...items]
    .sort((left, right) => {
      const valueDiff = right.value - left.value;
      if (valueDiff !== 0) {
        return valueDiff;
      }
      const nameDiff = left.name.localeCompare(right.name, "zh-CN");
      if (nameDiff !== 0) {
        return nameDiff;
      }
      return left.participantId.localeCompare(right.participantId, "zh-CN");
    })
    .map(item => item.participantId);
  return {
    type: "combatOrderSet",
    participantIds,
  };
}

export function buildImportRoleInitiativeEvents(params: {
  currentList: Initiative[];
  hp?: number | null;
  initiative: number;
  maxHp?: number | null;
  name: string;
  roleId: number;
}): StateEventAtom[] {
  const { currentList, hp, initiative, maxHp, name, roleId } = params;
  const participantId = `role:${roleId}`;
  const nextParticipant: Initiative = {
    participantId,
    name,
    roleId,
    value: initiative,
    hp: hp ?? null,
    maxHp: maxHp ?? null,
    extras: {},
  };
  const currentWithoutRole = currentList.filter(item => item.participantId !== participantId);
  const events: StateEventAtom[] = [
    {
      type: "combatParticipantUpsert",
      participantId,
      roleId,
      name,
      initiative,
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
  events.push(buildInitiativeOrderSetAtom([...currentWithoutRole, nextParticipant]));
  return events;
}

export function buildRemoveInitiativeEvents(currentList: Initiative[], item: Initiative): StateEventAtom[] {
  const remaining = currentList.filter(candidate => candidate.participantId !== item.participantId);
  return [
    {
      type: "combatParticipantRemove",
      participantId: item.participantId,
    },
    buildInitiativeOrderSetAtom(remaining),
  ];
}

export function buildUpdateInitiativeEvents(
  currentList: Initiative[],
  item: Initiative,
  patch: Partial<Initiative>,
): StateEventAtom[] {
  const events: StateEventAtom[] = [];
  const participantPatch: Extract<StateEventAtom, { type: "combatParticipantUpsert" }> = {
    type: "combatParticipantUpsert",
    participantId: item.participantId,
  };
  if (typeof patch.name === "string" && patch.name.trim()) {
    participantPatch.name = patch.name.trim();
  }
  if (typeof patch.value === "number") {
    participantPatch.initiative = patch.value;
  }

  const participantValues: Record<string, StateEventCombatValue> = {};
  if ("hp" in patch) {
    if (typeof item.roleId === "number" && typeof patch.hp === "number") {
      events.push({
        type: "varOp",
        scope: buildRoleStateEventScope(item.roleId),
        key: "hp",
        op: STATE_EVENT_VAR_OP.SET,
        value: patch.hp,
      });
    }
    else {
      participantValues.hp = patch.hp ?? null;
    }
  }
  if ("maxHp" in patch) {
    if (typeof item.roleId === "number" && typeof patch.maxHp === "number") {
      events.push({
        type: "varOp",
        scope: buildRoleStateEventScope(item.roleId),
        key: "maxHp",
        op: STATE_EVENT_VAR_OP.SET,
        value: patch.maxHp,
      });
    }
    else {
      participantValues.maxHp = patch.maxHp ?? null;
    }
  }
  if (Object.keys(participantValues).length > 0) {
    participantPatch.values = participantValues;
  }
  if (participantPatch.name || typeof participantPatch.initiative === "number" || participantPatch.values) {
    events.unshift(participantPatch);
  }
  if (typeof patch.value === "number") {
    const nextList = currentList.map(candidate => (
      candidate.participantId === item.participantId
        ? { ...candidate, value: patch.value ?? candidate.value }
        : candidate
    ));
    events.push(buildInitiativeOrderSetAtom(nextList));
  }
  return events;
}

export function buildUpdateInitiativeExtraEvents(
  item: Initiative,
  param: InitiativeParam | undefined,
  key: string,
  value: string,
): StateEventAtom[] {
  const normalizedValue = normalizeCombatValue(value);
  if (param?.source === "stateKey" && typeof item.roleId === "number" && typeof normalizedValue === "number") {
    return [{
      type: "varOp",
      scope: buildRoleStateEventScope(item.roleId),
      key: param.stateKey ?? param.key,
      op: STATE_EVENT_VAR_OP.SET,
      value: normalizedValue,
    }];
  }

  return [{
    type: "combatParticipantUpsert",
    participantId: item.participantId,
    values: {
      [key]: normalizedValue,
    },
  }];
}
