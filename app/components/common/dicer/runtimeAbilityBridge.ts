import { buildStateRuntime } from "@/components/chat/state/stateRuntime";

import type { ChatMessageResponse, RoleAbility } from "../../../../api";

type RuntimeRoleValues = Record<string, number>;

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

function applyRuntimeValue(nextAbility: RoleAbility, key: string, value: number): void {
  const normalizedValue = String(value);
  if (nextAbility.basic && Object.prototype.hasOwnProperty.call(nextAbility.basic, key)) {
    nextAbility.basic[key] = normalizedValue;
    return;
  }
  if (nextAbility.ability && Object.prototype.hasOwnProperty.call(nextAbility.ability, key)) {
    nextAbility.ability[key] = normalizedValue;
    return;
  }
  if (nextAbility.skill && Object.prototype.hasOwnProperty.call(nextAbility.skill, key)) {
    nextAbility.skill[key] = normalizedValue;
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
): RoleAbility {
  const nextAbility = cloneAbility(ability);
  if (!runtimeValues) {
    return nextAbility;
  }

  for (const [key, value] of Object.entries(runtimeValues)) {
    if (!Number.isFinite(value)) {
      continue;
    }
    applyRuntimeValue(nextAbility, key, value);
  }
  return nextAbility;
}

export function buildRuntimeRoleValuesByRoleId(
  messages: ChatMessageResponse[] | undefined,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): Record<number, RuntimeRoleValues> {
  if (!messages || messages.length === 0) {
    return {};
  }

  return buildStateRuntime({
    messages: messages.map(item => item.message),
    fallbackRoleAbilitiesByRoleId,
  }).derivedDisplayValues.rolesByRoleId;
}
