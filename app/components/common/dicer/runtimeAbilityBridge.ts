import type { StateEventVarOp } from "@/types/stateEvent";
import type { ChatMessageResponse, RoleAbility } from "../../../../api";
import { buildStateRuntime } from "@/components/chat/state/stateRuntime";
import { buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

type RuntimeRoleValues = Record<string, number>;
type MergeRuntimeValuesOptions = {
  overrideExisting?: boolean;
};
type NumericAbilitySection = "basic" | "ability" | "skill";

export type RuntimeStateValues = {
  room: RuntimeRoleValues;
  rolesByRoleId: Record<number, RuntimeRoleValues>;
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
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
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
  if (nextAbility.basic && Object.prototype.hasOwnProperty.call(nextAbility.basic, key)) {
    if (overrideExisting) {
      nextAbility.basic[key] = normalizedValue;
    }
    return;
  }
  if (nextAbility.ability && Object.prototype.hasOwnProperty.call(nextAbility.ability, key)) {
    if (overrideExisting) {
      nextAbility.ability[key] = normalizedValue;
    }
    return;
  }
  if (nextAbility.skill && Object.prototype.hasOwnProperty.call(nextAbility.skill, key)) {
    if (overrideExisting) {
      nextAbility.skill[key] = normalizedValue;
    }
    return;
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
    if (!Number.isFinite(value)) {
      continue;
    }
    applyRuntimeValue(nextAbility, key, value, overrideExisting);
  }
  return nextAbility;
}

export function buildRuntimeStateValues(
  messages: ChatMessageResponse[] | undefined,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): RuntimeStateValues {
  if (!messages || messages.length === 0) {
    return {
      room: {},
      rolesByRoleId: {},
    };
  }

  const runtime = buildStateRuntime({
    messages: messages.map(item => item.message),
    fallbackRoleAbilitiesByRoleId,
  }).derivedDisplayValues;

  return {
    room: runtime.room,
    rolesByRoleId: runtime.rolesByRoleId,
  };
}

export function buildRuntimeRoleValuesByRoleId(
  messages: ChatMessageResponse[] | undefined,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): Record<number, RuntimeRoleValues> {
  return buildRuntimeStateValues(messages, fallbackRoleAbilitiesByRoleId).rolesByRoleId;
}
