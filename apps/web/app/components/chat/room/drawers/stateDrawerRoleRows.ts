import type { StateEventAtom } from "@/types/stateEvent";

import { getNormalizedStateEventExtra, STATE_EVENT_SCOPE_KIND } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../../api";
import type { SortDirection } from "./initiativeListTypes";

export type CombatRoleRowSortInput = {
  initiative: number | null;
  isCurrent: boolean;
  roleName: string;
};

export type CombatInitiativeRecord = {
  hp: number | null;
  initiative: number;
  maxHp: number | null;
  recordId: string;
  roleId: number;
  sourceMessageId: number;
};

export type RoleAbilityFieldDeletePatch = {
  abilityFields?: Record<string, string>;
  basicFields?: Record<string, string>;
  skillFields?: Record<string, string>;
};

export type CombatRecordValueRow = {
  baseValue: number;
  displayValue: number;
  key: string;
};

export type CombatRecordValueRowInput = {
  baseValues?: Record<string, number>;
  derivedValues?: Record<string, number>;
  fallbackAbility?: RoleAbilityValueSections | null;
  key: string;
  recordValue?: number | null;
  valueKeys: string[];
};

export type CustomCombatKvInput = {
  key: string;
  value: number;
};

export type CustomCombatKvParseResult = {
  entries: CustomCombatKvInput[];
  error?: string;
};

export type CustomCombatStateKeyParts = {
  fieldKey: string;
  name: string;
};

type RoleAbilityValueSections = {
  ability?: Record<string, string>;
  basic?: Record<string, string>;
  skill?: Record<string, string>;
};

const INITIATIVE_ROLE_VALUE_KEYS = ["initiative", "init", "先攻", "先攻值"];
const CUSTOM_COMBAT_STATE_KEY_PREFIX = "customCombat";

function normalizeRoleValueKey(key: string): string {
  return key.trim().toLowerCase();
}

export function isInitiativeRoleValueKey(key: string): boolean {
  const normalized = normalizeRoleValueKey(key);
  return INITIATIVE_ROLE_VALUE_KEYS.some(alias => normalizeRoleValueKey(alias) === normalized);
}

export function readCombatRoleInitiativeValue(values: Record<string, number> | undefined): number | null {
  if (!values) {
    return null;
  }
  for (const key of INITIATIVE_ROLE_VALUE_KEYS) {
    const value = values[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  const matchedKey = Object.keys(values).find(isInitiativeRoleValueKey);
  if (!matchedKey) {
    return null;
  }
  const value = values[matchedKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildCustomCombatStateKey(name: string, fieldKey: string): string {
  return [
    CUSTOM_COMBAT_STATE_KEY_PREFIX,
    encodeURIComponent(name.trim()),
    encodeURIComponent(fieldKey.trim()),
  ].join(":");
}

export function parseCustomCombatStateKey(key: string): CustomCombatStateKeyParts | null {
  const parts = key.split(":");
  if (parts.length !== 3 || parts[0] !== CUSTOM_COMBAT_STATE_KEY_PREFIX) {
    return null;
  }
  const name = decodeURIComponent(parts[1]).trim();
  const fieldKey = decodeURIComponent(parts[2]).trim();
  if (!name || !fieldKey) {
    return null;
  }
  return { name, fieldKey };
}

export function parseCustomCombatKvText(text: string): CustomCombatKvParseResult {
  const chunks = text
    .split(/[\n,，]+/)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  if (chunks.length === 0) {
    return { entries: [], error: "请至少填写一个属性" };
  }

  const entries: CustomCombatKvInput[] = [];
  const seenKeys = new Set<string>();
  for (const chunk of chunks) {
    const separatorIndex = chunk.search(/[:：]/);
    if (separatorIndex <= 0) {
      return { entries: [], error: `无法识别属性：${chunk}` };
    }
    const key = chunk.slice(0, separatorIndex).trim();
    const rawValue = chunk.slice(separatorIndex + 1).trim();
    const value = Number(rawValue);
    if (!key || !Number.isFinite(value)) {
      return { entries: [], error: `无法识别属性：${chunk}` };
    }
    const normalizedKey = normalizeRoleValueKey(key);
    if (seenKeys.has(normalizedKey)) {
      return { entries: [], error: `属性重复：${key}` };
    }
    seenKeys.add(normalizedKey);
    entries.push({ key, value });
  }

  return { entries };
}

export function collectRecordedRoleValueIds(recordedRoleValueKeysByRoleId: Record<number, string[]>): number[] {
  return Object.keys(recordedRoleValueKeysByRoleId)
    .map(value => Number(value))
    .filter(roleId => Number.isFinite(roleId) && roleId > 0);
}

export function shouldCommitCombatRoleValueEdit(previousValue: number | null | undefined, nextValue: number): boolean {
  return typeof previousValue !== "number" || previousValue !== nextValue;
}

export function buildNextCopiedInitiativeRoleName(baseName: string, existingNames: string[]): string {
  const trimmedBaseName = baseName.trim() || "角色";
  const suffixPattern = new RegExp(`^${escapeRegExp(trimmedBaseName)}(\\d+)$`);
  let maxSuffix = 0;
  for (const name of existingNames) {
    const trimmedName = name.trim();
    const match = trimmedName.match(suffixPattern);
    if (!match) {
      continue;
    }
    const suffix = Number(match[1]);
    if (Number.isInteger(suffix) && suffix > maxSuffix) {
      maxSuffix = suffix;
    }
  }
  return `${trimmedBaseName}${maxSuffix + 1}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRoleAbilityValueKey(record: Record<string, string> | undefined, key: string): string | null {
  if (!record) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return key;
  }
  const normalizedKey = key.trim().toLowerCase();
  return Object.keys(record).find(candidate => candidate.trim().toLowerCase() === normalizedKey) ?? null;
}

function findRoleAbilityValueKeyByAliases(record: Record<string, string> | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const matchedKey = findRoleAbilityValueKey(record, key);
    if (matchedKey) {
      return matchedKey;
    }
  }
  return null;
}

function readNumericRoleAbilityValue(record: Record<string, string> | undefined, keys: string[]): number | null {
  const matchedKey = findRoleAbilityValueKeyByAliases(record, keys);
  if (!matchedKey) {
    return null;
  }
  const value = Number(record?.[matchedKey]);
  return Number.isFinite(value) ? value : null;
}

function readNumericStateValue(values: Record<string, number> | undefined, keys: string[]): number | null {
  if (!values) {
    return null;
  }
  for (const key of keys) {
    const value = values[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  const matchedKey = Object.keys(values).find(candidate => keys.some(key => normalizeRoleValueKey(key) === normalizeRoleValueKey(candidate)));
  if (!matchedKey) {
    return null;
  }
  const value = values[matchedKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readFallbackRoleAbilityNumber(ability: RoleAbilityValueSections | null | undefined, keys: string[]): number | null {
  return readNumericRoleAbilityValue(ability?.basic, keys)
    ?? readNumericRoleAbilityValue(ability?.ability, keys)
    ?? readNumericRoleAbilityValue(ability?.skill, keys);
}

export function buildCombatRecordValueRow({
  baseValues,
  derivedValues,
  fallbackAbility,
  key,
  recordValue,
  valueKeys,
}: CombatRecordValueRowInput): CombatRecordValueRow | null {
  const fallbackValue = readFallbackRoleAbilityNumber(fallbackAbility, valueKeys);
  if (typeof fallbackValue === "number") {
    const baseValue = readNumericStateValue(baseValues, valueKeys) ?? fallbackValue;
    const displayValue = readNumericStateValue(derivedValues, valueKeys) ?? baseValue;
    return { key, baseValue, displayValue };
  }

  if (typeof recordValue === "number" && Number.isFinite(recordValue)) {
    return { key, baseValue: recordValue, displayValue: recordValue };
  }

  return null;
}

export function buildRoleAbilityFieldDeletePatch(
  ability: RoleAbilityValueSections | null | undefined,
  key: string,
): RoleAbilityFieldDeletePatch | null {
  const sections = [
    ["basic", "basicFields"],
    ["ability", "abilityFields"],
    ["skill", "skillFields"],
  ] as const;
  const keys = isInitiativeRoleValueKey(key) ? INITIATIVE_ROLE_VALUE_KEYS : [key];
  for (const [section, patchKey] of sections) {
    const matchedKey = findRoleAbilityValueKeyByAliases(ability?.[section], keys);
    if (matchedKey) {
      // 后端字段接口约定：value 为 null 表示删除该键。
      return { [patchKey]: { [matchedKey]: null as unknown as string } };
    }
  }
  return null;
}

type RoleVarOp = Extract<StateEventAtom, { type: "varOp" }> & {
  scope: { kind: "role"; roleId: number };
};

function isRoleVarOp(event: StateEventAtom, key: string): event is RoleVarOp {
  return event.type === "varOp"
    && event.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE
    && (isInitiativeRoleValueKey(key)
      ? isInitiativeRoleValueKey(event.key)
      : normalizeRoleValueKey(event.key) === normalizeRoleValueKey(key));
}

function findRoleVarValue(events: StateEventAtom[], roleId: number, keys: string[]): number | null {
  const normalizedKeys = new Set(keys.map(normalizeRoleValueKey));
  const matched = events.find(event => (
    event.type === "varOp"
    && event.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE
    && event.scope.roleId === roleId
    && normalizedKeys.has(normalizeRoleValueKey(event.key))
  ));
  return matched?.type === "varOp" ? matched.value : null;
}

export function collectCombatInitiativeRecords(messages: ChatMessageResponse[] | undefined): CombatInitiativeRecord[] {
  const latestRecordByRoleId = new Map<number, CombatInitiativeRecord>();
  (messages ?? []).forEach(({ message }) => {
    if (message.status === 1 || message.messageType !== MESSAGE_TYPE.STATE_EVENT || !Number.isFinite(message.messageId)) {
      return;
    }
    const stateEvent = getNormalizedStateEventExtra(message.extra);
    const events = stateEvent?.events ?? [];
    events
      .filter(event => isRoleVarOp(event, "initiative"))
      .forEach((event, index) => {
        latestRecordByRoleId.set(event.scope.roleId, {
          hp: findRoleVarValue(events, event.scope.roleId, ["hp"]),
          initiative: event.value,
          maxHp: findRoleVarValue(events, event.scope.roleId, ["maxhp", "hpmax"]),
          recordId: `${message.messageId}:${event.scope.roleId}:${index}`,
          roleId: event.scope.roleId,
          sourceMessageId: message.messageId,
        });
      });
  });
  return [...latestRecordByRoleId.values()];
}

export function isInlineRoleValueKey(key: string): boolean {
  return !isInitiativeRoleValueKey(key);
}

export function compareCombatRoleRowsByInitiative(
  left: CombatRoleRowSortInput,
  right: CombatRoleRowSortInput,
  direction: SortDirection = "desc",
): number {
  const dir = direction === "asc" ? 1 : -1;
  const leftValue = left.initiative;
  const rightValue = right.initiative;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    if (leftValue !== rightValue) {
      return leftValue > rightValue ? dir : -dir;
    }
  }
  else if (typeof leftValue === "number") {
    return -1;
  }
  else if (typeof rightValue === "number") {
    return 1;
  }

  if (left.isCurrent !== right.isCurrent) {
    return left.isCurrent ? -1 : 1;
  }
  return left.roleName.localeCompare(right.roleName, "zh-CN");
}
