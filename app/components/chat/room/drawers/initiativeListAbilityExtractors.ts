import {
  applyPokemonStageModifier,
  formatPokemonModifiedStat,
} from "./initiativePokemonRules";

type AbilityRecord = {
  ruleId?: number;
  ability?: Record<string, unknown>;
  basic?: Record<string, unknown>;
  skill?: Record<string, unknown>;
};

type AbilityQueryLike = {
  data?: {
    success?: boolean;
    data?: AbilityRecord[];
  };
} | undefined;

export type PokemonInitiativeRoll = {
  total: number;
  diceResult: number;
  speedRollBonus: number;
  speedDisplay: string;
};

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

export function stringifyRecord(obj?: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj)
    return result;
  Object.entries(obj).forEach(([k, v]) => {
    result[k] = String(v ?? "");
  });
  return result;
}

function findRuleRecord(query: AbilityQueryLike, ruleId: number | undefined): AbilityRecord | null {
  const res = query?.data;
  if (!res?.success || !Array.isArray(res.data) || !ruleId)
    return null;
  return res.data.find(item => item.ruleId === ruleId) ?? null;
}

function lower(value: string): string {
  return String(value).toLowerCase();
}

function tryPickScalar(obj: unknown): number | null {
  if (obj == null)
    return null;
  if (typeof obj === "number")
    return Number.isFinite(obj) ? obj : null;
  if (typeof obj === "string") {
    const num = Number(obj);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function searchNumericValue(node: unknown, candidates: string[], depth = 0, matchNamedFields = false): number | null {
  if (node == null || depth > 3)
    return null;

  if (typeof node === "object" && !Array.isArray(node)) {
    const record = node as Record<string, unknown>;
    const keys = Object.keys(record);

    if (matchNamedFields) {
      const nameField = record.name ?? record.label ?? record.title;
      if (typeof nameField === "string") {
        const normalizedName = lower(nameField);
        if (candidates.some(c => normalizedName.includes(lower(c)))) {
          const val = tryPickScalar(record.value ?? record.val ?? record.score ?? record.num);
          if (val != null)
            return val;
        }
      }
    }

    for (const key of keys) {
      const normalizedKey = lower(key);
      if (candidates.some(c => normalizedKey.includes(lower(c)))) {
        const val = tryPickScalar(record[key]) ?? searchNumericValue(record[key], candidates, depth + 1, matchNamedFields);
        if (val != null)
          return val;
      }
    }

    for (const key of keys) {
      const found = searchNumericValue(record[key], candidates, depth + 1, matchNamedFields);
      if (found != null)
        return found;
    }
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = searchNumericValue(item, candidates, depth + 1, matchNamedFields);
      if (found != null)
        return found;
    }
  }

  return null;
}

function getAbilitySource(record: AbilityRecord): Record<string, unknown> {
  return {
    ...(record.ability ?? {}),
    ...(record.basic ?? {}),
    ...(record.skill ?? {}),
  };
}

export function extractAgilityFromQuery(ruleId: number | undefined, query: AbilityQueryLike): number | null {
  const record = findRuleRecord(query, ruleId);
  if (!record || !ruleId)
    return null;

  const source = getAbilitySource(record);

  if (ruleId === 7) {
    const speed = searchNumericValue(source, ["速度", "speed", "spd"]);
    if (speed != null) {
      const speedStage = searchNumericValue(source, ["速度修正", "speedstage", "spdstage"]) ?? 0;
      const finalSpeed = applyPokemonStageModifier(speed, speedStage);
      const diceResult = Math.floor(Math.random() * 20) + 1;
      return diceResult + Math.floor(finalSpeed / 10);
    }
  }

  return searchNumericValue(source, ["先攻", "先攻值", "initiative"], 0, true)
    ?? searchNumericValue(source, ["敏捷", "敏", "dex", "agi", "速度", "spd"], 0, true);
}

export function extractPokemonInitiativeRoll(ruleId: number | undefined, query: AbilityQueryLike): PokemonInitiativeRoll | null {
  if (ruleId !== 7)
    return null;

  const record = findRuleRecord(query, 7);
  if (!record)
    return null;

  const source = getAbilitySource(record);
  const speed = searchNumericValue(source, ["速度", "speed", "spd"]);
  if (speed == null)
    return null;

  const speedStage = searchNumericValue(source, ["速度修正", "speedstage", "spdstage"]) ?? 0;
  const finalSpeed = applyPokemonStageModifier(speed, speedStage);
  const speedDisplay = formatPokemonModifiedStat("速度", speed, speedStage, finalSpeed);

  const diceResult = Math.floor(Math.random() * 20) + 1;
  const speedRollBonus = Math.floor(finalSpeed / 10);
  return {
    total: diceResult + speedRollBonus,
    diceResult,
    speedRollBonus,
    speedDisplay,
  };
}

export function extractAttrFromQuery(
  ruleId: number | undefined,
  query: AbilityQueryLike,
  attrKey: string,
): number | string | null {
  const record = findRuleRecord(query, ruleId);
  if (!record)
    return null;

  const lowerKey = attrKey.toLowerCase();
  const pick = (obj?: Record<string, unknown>) => {
    if (!obj)
      return undefined;
    for (const [k, v] of Object.entries(obj)) {
      if (String(k).toLowerCase() === lowerKey)
        return v;
    }
    return undefined;
  };

  const val = pick(record.ability) ?? pick(record.basic);
  if (val == null)
    return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : String(val);
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
