import { buildStateRuntime } from "@/components/chat/state/stateRuntime";

import type { ChatMessageResponse, RoleAbility } from "../../../../api";

type RuntimeRoleValues = Record<string, number>;
type MergeRuntimeValuesOptions = {
  overrideExisting?: boolean;
};

export type RuntimeStateValues = {
  room: RuntimeRoleValues;
  rolesByRoleId: Record<number, RuntimeRoleValues>;
};

function cloneAbility(ability: RoleAbility | null | undefined): RoleAbility {
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
  const nextAbility = cloneAbility(ability);
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
