import type { AbilityRecord } from "@tuanchat/domain/ability-extractors";

import { getAbilitySource, searchNumericValue } from "@tuanchat/domain/ability-extractors";

type AbilityQueryLike = {
  data?: {
    success?: boolean;
    data?: AbilityRecord[];
  };
} | undefined;

export function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed)
    return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function parseNumberOrZero(value: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function findRuleRecord(query: AbilityQueryLike, ruleId: number | undefined): AbilityRecord | null {
  const res = query?.data;
  if (!res?.success || !Array.isArray(res.data) || !ruleId)
    return null;
  return res.data.find(item => item.ruleId === ruleId) ?? null;
}

export function extractAgilityFromQuery(ruleId: number | undefined, query: AbilityQueryLike): number | null {
  const record = findRuleRecord(query, ruleId);
  if (!record || !ruleId)
    return null;

  const source = getAbilitySource(record);

  return searchNumericValue(source, ["先攻", "先攻值", "initiative"], 0, true)
    ?? searchNumericValue(source, ["敏捷", "敏", "dex", "agi", "速度", "spd"], 0, true);
}

export function extractHpFromQuery(
  ruleId: number | undefined,
  query: AbilityQueryLike,
): { hp: number | null; maxHp: number | null } | null {
  const record = findRuleRecord(query, ruleId);
  if (!record)
    return null;

  const source = record.ability ?? {};
  const entries = Object.entries(source);
  if (!entries.length)
    return { hp: null, maxHp: null };

  const normalizeKey = (s: string) => String(s).toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  const hpKeys = ["hp", "当前hp", "生命", "生命值", "体力", "血量", "health"].map(normalizeKey);
  const maxHpKeys = ["最大hp", "maxhp", "hp上限", "最大生命", "最大生命值", "最大体力", "最大血量", "maxhealth"].map(normalizeKey);

  const valueByKey = new Map<string, number>();
  for (const [k, v] of entries) {
    const num = Number(v);
    if (!Number.isFinite(num))
      continue;
    valueByKey.set(normalizeKey(k), num);
  }

  const pickFirst = (keys: string[]) => {
    for (const key of keys) {
      const found = valueByKey.get(key);
      if (found != null)
        return found;
    }
    return null;
  };

  return {
    hp: pickFirst(hpKeys),
    maxHp: pickFirst(maxHpKeys),
  };
}
