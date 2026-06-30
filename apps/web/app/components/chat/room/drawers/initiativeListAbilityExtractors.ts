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
