import type { StateEventVarOp } from "@tuanchat/domain/state-event";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import {
  buildRoleStateEventScope,
  STATE_EVENT_VAR_OP,

} from "@tuanchat/domain/state-event";
import { buildStateRuntime } from "@tuanchat/domain/state-runtime";

type RuntimeRoleValues = Record<string, number>;
type MergeRuntimeValuesOptions = {
  overrideExisting?: boolean;
};
type NumericAbilitySection = "basic" | "ability" | "skill";

export type RuntimeStateValues = {
  rolesByRoleId: Record<number, RuntimeRoleValues>;
  room: RuntimeRoleValues;
};

const NUMERIC_ABILITY_SECTIONS: NumericAbilitySection[] = ["basic", "ability", "skill"];

export function cloneRoleAbility(ability: RoleAbility | null | undefined): RoleAbility {
  return {
    ...(ability ?? {}),
    act: { ...(ability?.act ?? {}) },
    basic: { ...(ability?.basic ?? {}) },
    ability: { ...(ability?.ability ?? {}) },
    skill: { ...(ability?.skill ?? {}) },
    record: { ...(ability?.record ?? {}) },
    extra: { ...(ability?.extra ?? {}) },
  };
}

function readFiniteNumericAbilityValue(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function collectNumericRoleAbilityValues(ability: RoleAbility | null | undefined): RuntimeRoleValues {
  const values: RuntimeRoleValues = {};
  for (const section of NUMERIC_ABILITY_SECTIONS) {
    const record = ability?.[section];
    if (!record) {
      continue;
    }
    for (const [key, rawValue] of Object.entries(record)) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        continue;
      }
      const value = readFiniteNumericAbilityValue(rawValue);
      if (typeof value === "number") {
        values[key] = value;
      }
    }
  }
  return values;
}

export function buildRoleAbilityStateEventsFromDiff(
  roleId: number,
  beforeAbility: RoleAbility | null | undefined,
  afterAbility: RoleAbility | null | undefined,
): StateEventVarOp[] {
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return [];
  }

  const beforeValues = collectNumericRoleAbilityValues(beforeAbility);
  const afterValues = collectNumericRoleAbilityValues(afterAbility);

  return Object.entries(afterValues)
    .filter(([key, afterValue]) => beforeValues[key] !== afterValue)
    .map(([key, value]) => ({
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key,
      op: STATE_EVENT_VAR_OP.SET,
      value,
    }));
}

function applyRuntimeValue(
  nextAbility: RoleAbility,
  key: string,
  value: number,
  overrideExisting: boolean,
): void {
  const normalizedValue = String(value);
  for (const section of NUMERIC_ABILITY_SECTIONS) {
    const record = nextAbility[section];
    if (record && Object.prototype.hasOwnProperty.call(record, key)) {
      if (overrideExisting) {
        record[key] = normalizedValue;
      }
      return;
    }
  }

  nextAbility.skill = {
    ...(nextAbility.skill ?? {}),
    [key]: normalizedValue,
  };
}

export function mergeRuntimeRoleValuesIntoAbility(
  ability: RoleAbility | null | undefined,
  runtimeValues: RuntimeRoleValues | null | undefined,
  options: MergeRuntimeValuesOptions = {},
): RoleAbility {
  const nextAbility = cloneRoleAbility(ability);
  if (!runtimeValues) {
    return nextAbility;
  }

  const { overrideExisting = true } = options;
  for (const [key, value] of Object.entries(runtimeValues)) {
    if (Number.isFinite(value)) {
      applyRuntimeValue(nextAbility, key, value, overrideExisting);
    }
  }
  return nextAbility;
}

export function buildRuntimeStateValues(
  messages: Message[] | undefined,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): RuntimeStateValues {
  if (!messages || messages.length === 0) {
    return {
      room: {},
      rolesByRoleId: {},
    };
  }

  const runtime = buildStateRuntime({
    messages,
    fallbackRoleAbilitiesByRoleId,
  }).derivedDisplayValues;

  return {
    room: runtime.room,
    rolesByRoleId: runtime.rolesByRoleId,
  };
}
