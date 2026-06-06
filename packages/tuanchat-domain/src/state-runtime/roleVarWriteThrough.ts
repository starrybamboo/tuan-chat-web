import type { AbilityByRuleUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleUpdateRequest";
import type { AbilitySetRequest } from "@tuanchat/openapi-client/models/AbilitySetRequest";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import type { StateEventAtom, StateEventVarOp } from "../state-event";

import { STATE_EVENT_VAR_OP } from "../state-event";

type NumericAbilitySection = "basic" | "ability" | "skill";
type RoleVarOp = StateEventVarOp & { scope: { kind: "role"; roleId: number } };
type RoleVarOpWithSnapshot = RoleVarOp & {
  afterValue: number;
  beforeValue: number;
};
type RoleAbilitySections = Pick<RoleAbility, NumericAbilitySection>;
type ChangedRoleAbilitySnapshot = {
  ability: RoleAbility;
  roleId: number;
  ruleId: number;
};

export type WriteRoleVarOpsResult = {
  changedAbilities: ChangedRoleAbilitySnapshot[];
  changedRoleIds: number[];
  roleVarOps: RoleVarOpWithSnapshot[];
};

export type RoleVarWriteThroughDeps = {
  loadRoleAbility: (roleId: number, ruleId: number) => Promise<RoleAbility | null | undefined>;
  createRoleAbility: (request: AbilitySetRequest) => Promise<unknown>;
  updateRoleAbility: (request: AbilityByRuleUpdateRequest) => Promise<unknown>;
};

export type WriteRoleVarOpsParams = RoleVarWriteThroughDeps & {
  events: StateEventAtom[];
  ruleId: number;
};

const NUMERIC_ABILITY_SECTIONS: NumericAbilitySection[] = ["basic", "ability", "skill"];
const DEFAULT_ABILITY_KEYS = new Set(["hp", "hpm", "hpmax", "maxhp", "san", "mp"]);

function cloneRecord(record: Record<string, string> | undefined): Record<string, string> {
  return { ...record };
}

export function cloneRoleAbilityForWriteThrough(ability: RoleAbility | null | undefined): RoleAbility {
  return {
    ...ability,
    act: { ...ability?.act },
    basic: cloneRecord(ability?.basic),
    ability: cloneRecord(ability?.ability),
    skill: cloneRecord(ability?.skill),
    extra: { ...ability?.extra },
  };
}

function readNumericValue(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findExistingSection(ability: RoleAbility, key: string): NumericAbilitySection | null {
  for (const section of NUMERIC_ABILITY_SECTIONS) {
    if (Object.prototype.hasOwnProperty.call(ability[section] ?? {}, key)) {
      return section;
    }
  }
  return null;
}

function defaultSectionForKey(key: string): NumericAbilitySection {
  const normalized = key.trim().toLowerCase();
  return DEFAULT_ABILITY_KEYS.has(normalized) ? "ability" : "skill";
}

function readAbilityNumber(ability: RoleAbility, key: string): number {
  const section = findExistingSection(ability, key);
  if (!section) {
    return 0;
  }
  return readNumericValue(ability[section]?.[key]) ?? 0;
}

function writeAbilityNumber(ability: RoleAbility, key: string, value: number): void {
  const section = findExistingSection(ability, key) ?? defaultSectionForKey(key);
  ability[section] = {
    ...ability[section],
    [key]: String(value),
  };
}

function applyRoleVarOp(ability: RoleAbility, op: RoleVarOp): RoleVarOpWithSnapshot {
  const beforeValue = readAbilityNumber(ability, op.key);
  const nextValue = op.op === STATE_EVENT_VAR_OP.SET
    ? op.value
    : op.op === STATE_EVENT_VAR_OP.ADD
      ? beforeValue + op.value
      : beforeValue - op.value;
  writeAbilityNumber(ability, op.key, nextValue);
  return {
    ...op,
    beforeValue,
    afterValue: nextValue,
  };
}

function recordsEqual(left: Record<string, string> | undefined, right: Record<string, string> | undefined): boolean {
  const leftEntries = Object.entries(left ?? {});
  const rightRecord = right ?? {};
  if (leftEntries.length !== Object.keys(rightRecord).length) {
    return false;
  }
  return leftEntries.every(([key, value]) => rightRecord[key] === value);
}

function hasPersistedAbility(ability: RoleAbility | null | undefined): boolean {
  return typeof ability?.abilityId === "number" && ability.abilityId > 0;
}

function buildChangedSections(before: RoleAbility | null | undefined, after: RoleAbility): RoleAbilitySections {
  const request: RoleAbilitySections = {};
  for (const section of NUMERIC_ABILITY_SECTIONS) {
    if (!recordsEqual(before?.[section], after[section])) {
      request[section] = { ...after[section] };
    }
  }
  return request;
}

function hasChangedSections(sections: RoleAbilitySections): boolean {
  return NUMERIC_ABILITY_SECTIONS.some(section => Object.prototype.hasOwnProperty.call(sections, section));
}

export function collectRoleVarOps(events: StateEventAtom[]): RoleVarOp[] {
  return events.filter((event): event is RoleVarOp => (
    event.type === "varOp"
    && event.scope.kind === "role"
    && event.scope.roleId > 0
  ));
}

export function applyRoleVarOpsToAbility(
  ability: RoleAbility | null | undefined,
  roleId: number,
  ruleId: number,
  ops: RoleVarOp[],
): RoleAbility {
  const nextAbility = cloneRoleAbilityForWriteThrough(ability);
  nextAbility.roleId = nextAbility.roleId ?? roleId;
  nextAbility.ruleId = nextAbility.ruleId ?? ruleId;
  ops.forEach(op => applyRoleVarOp(nextAbility, op));
  return nextAbility;
}

export function mergeRoleVarOpSnapshotsIntoEvents(
  events: StateEventAtom[],
  roleVarOps: RoleVarOpWithSnapshot[],
): StateEventAtom[] {
  const snapshots = [...roleVarOps];
  return events.map((event) => {
    if (event.type !== "varOp" || event.scope.kind !== "role") {
      return event;
    }
    return snapshots.shift() ?? event;
  });
}

function applyRoleVarOpsToAbilityWithSnapshots(
  ability: RoleAbility | null | undefined,
  roleId: number,
  ruleId: number,
  ops: RoleVarOp[],
): { afterAbility: RoleAbility; roleVarOps: RoleVarOpWithSnapshot[] } {
  const nextAbility = cloneRoleAbilityForWriteThrough(ability);
  nextAbility.roleId = nextAbility.roleId ?? roleId;
  nextAbility.ruleId = nextAbility.ruleId ?? ruleId;
  const roleVarOps = ops.map(op => applyRoleVarOp(nextAbility, op));
  return {
    afterAbility: nextAbility,
    roleVarOps,
  };
}

export async function persistRoleAbilitySnapshot(params: RoleVarWriteThroughDeps & {
  afterAbility: RoleAbility;
  beforeAbility: RoleAbility | null | undefined;
  roleId: number;
  ruleId: number;
}): Promise<boolean> {
  const { afterAbility, beforeAbility, createRoleAbility, roleId, ruleId, updateRoleAbility } = params;
  if (!Number.isFinite(roleId) || roleId <= 0 || !Number.isFinite(ruleId) || ruleId <= 0) {
    throw new Error("当前空间没有有效规则，无法写入角色卡");
  }
  const changedSections = buildChangedSections(beforeAbility, afterAbility);
  if (!hasChangedSections(changedSections)) {
    return false;
  }

  if (hasPersistedAbility(beforeAbility) || hasPersistedAbility(afterAbility)) {
    await updateRoleAbility({
      roleId,
      ruleId,
      ...changedSections,
    });
    return true;
  }

  await createRoleAbility({
    roleId,
    ruleId,
    ...changedSections,
  });
  return true;
}

export async function writeRoleVarOpsThroughAbilities({
  events,
  ruleId,
  loadRoleAbility,
  createRoleAbility,
  updateRoleAbility,
}: WriteRoleVarOpsParams): Promise<WriteRoleVarOpsResult> {
  const roleVarOps = collectRoleVarOps(events);
  if (roleVarOps.length === 0) {
    return { changedAbilities: [], changedRoleIds: [], roleVarOps: [] };
  }
  if (!Number.isFinite(ruleId) || ruleId <= 0) {
    throw new Error("当前空间没有有效规则，无法写入角色卡");
  }

  const opsByRoleId = new Map<number, RoleVarOp[]>();
  roleVarOps.forEach((op) => {
    const ops = opsByRoleId.get(op.scope.roleId) ?? [];
    ops.push(op);
    opsByRoleId.set(op.scope.roleId, ops);
  });

  const changedRoleIds: number[] = [];
  const changedAbilities: ChangedRoleAbilitySnapshot[] = [];
  const roleVarOpsWithSnapshots: RoleVarOpWithSnapshot[] = [];
  for (const [roleId, ops] of opsByRoleId) {
    const beforeAbility = await loadRoleAbility(roleId, ruleId);
    const { afterAbility, roleVarOps: enrichedOps } = applyRoleVarOpsToAbilityWithSnapshots(beforeAbility, roleId, ruleId, ops);
    roleVarOpsWithSnapshots.push(...enrichedOps);
    const changed = await persistRoleAbilitySnapshot({
      beforeAbility,
      afterAbility,
      roleId,
      ruleId,
      loadRoleAbility,
      createRoleAbility,
      updateRoleAbility,
    });
    if (changed) {
      changedRoleIds.push(roleId);
      changedAbilities.push({
        ability: cloneRoleAbilityForWriteThrough(afterAbility),
        roleId,
        ruleId,
      });
    }
  }

  return { changedAbilities, changedRoleIds, roleVarOps: roleVarOpsWithSnapshots };
}
