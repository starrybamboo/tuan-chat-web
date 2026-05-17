import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

type AbilityRecord = RoleAbility;

function lower(value: string) {
  return String(value).toLowerCase();
}

function tryPickScalar(obj: unknown): number | null {
  if (obj == null) {
    return null;
  }
  if (typeof obj === "number") {
    return Number.isFinite(obj) ? obj : null;
  }
  if (typeof obj === "string") {
    const num = Number(obj);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function searchNumericValue(node: unknown, candidates: string[], depth = 0, matchNamedFields = false): number | null {
  if (node == null || depth > 3) {
    return null;
  }

  if (typeof node === "object" && !Array.isArray(node)) {
    const record = node as Record<string, unknown>;
    const keys = Object.keys(record);

    if (matchNamedFields) {
      const nameField = record.name ?? record.label ?? record.title;
      if (typeof nameField === "string") {
        const normalizedName = lower(nameField);
        if (candidates.some(candidate => normalizedName.includes(lower(candidate)))) {
          const value = tryPickScalar(record.value ?? record.val ?? record.score ?? record.num);
          if (value != null) {
            return value;
          }
        }
      }
    }

    for (const key of keys) {
      const normalizedKey = lower(key);
      if (candidates.some(candidate => normalizedKey.includes(lower(candidate)))) {
        const value = tryPickScalar(record[key]) ?? searchNumericValue(record[key], candidates, depth + 1, matchNamedFields);
        if (value != null) {
          return value;
        }
      }
    }

    for (const key of keys) {
      const value = searchNumericValue(record[key], candidates, depth + 1, matchNamedFields);
      if (value != null) {
        return value;
      }
    }
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const value = searchNumericValue(item, candidates, depth + 1, matchNamedFields);
      if (value != null) {
        return value;
      }
    }
  }

  return null;
}

function getAbilitySource(record: AbilityRecord): Record<string, unknown> {
  return {
    ...record.ability,
    ...record.basic,
    ...record.skill,
  };
}

export function extractAgilityFromAbilityRecord(record: AbilityRecord | null | undefined): number | null {
  if (!record) {
    return null;
  }

  const source = getAbilitySource(record);
  return searchNumericValue(source, ["先攻", "先攻值", "initiative"], 0, true)
    ?? searchNumericValue(source, ["敏捷", "敏", "dex", "agi", "速度", "spd"], 0, true);
}

export function extractHpFromAbilityRecord(record: AbilityRecord | null | undefined): { hp: number | null; maxHp: number | null } | null {
  if (!record) {
    return null;
  }

  const source = record.ability ?? {};
  const entries = Object.entries(source);
  if (entries.length === 0) {
    return { hp: null, maxHp: null };
  }

  const normalizeKey = (value: string) => String(value).toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  const hpKeys = ["hp", "当前hp", "生命", "生命值", "体力", "血量", "health"].map(normalizeKey);
  const maxHpKeys = ["最大hp", "maxhp", "hp上限", "最大生命", "最大生命值", "最大体力", "最大血量", "maxhealth"].map(normalizeKey);

  const valueByKey = new Map<string, number>();
  for (const [key, rawValue] of entries) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      continue;
    }
    valueByKey.set(normalizeKey(key), value);
  }

  const pickFirst = (keys: string[]) => {
    for (const key of keys) {
      const found = valueByKey.get(key);
      if (found != null) {
        return found;
      }
    }
    return null;
  };

  return {
    hp: pickFirst(hpKeys),
    maxHp: pickFirst(maxHpKeys),
  };
}
