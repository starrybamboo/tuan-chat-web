import { useMemo } from "react";

import type { Initiative, SortDirection, SortKey } from "./initiativeListTypes";

import { extractAttrFromQuery } from "./initiativeListAbilityExtractors";
import { computePokemonDefensiveMatchups } from "./initiativePokemonRules";

type AbilityRecord = {
  ruleId?: number;
  ability?: Record<string, unknown>;
  basic?: Record<string, unknown>;
  skill?: Record<string, unknown>;
};

export type InitiativeAbilityQuery = {
  data?: {
    success?: boolean;
    data?: AbilityRecord[];
  };
  isLoading?: boolean;
} | undefined;

export type InitiativeRoleRef = {
  roleId: number;
  roleName?: string | null;
};

export type PokemonDefensiveMatchups = Record<"4" | "2" | "0.5" | "0.25" | "0", string[]>;

type UsePokemonInitiativeMetadataOptions = {
  abilityQueries: InitiativeAbilityQuery[];
  importableRoles: InitiativeRoleRef[];
  isPokemonRule: boolean;
  ruleId?: number;
};

function findRuleRecord(query: InitiativeAbilityQuery, ruleId?: number): AbilityRecord | null {
  const res = query?.data;
  if (!res?.success || !Array.isArray(res.data) || !ruleId)
    return null;

  return res.data.find(item => item.ruleId === ruleId) ?? null;
}

function getAbilitySource(record: AbilityRecord): Record<string, unknown> {
  return {
    ...(record.ability ?? {}),
    ...(record.basic ?? {}),
    ...(record.skill ?? {}),
  };
}

function normalizePokemonTypeValue(value: unknown): string | null {
  if (value == null)
    return null;

  const text = String(value).trim();
  return text || null;
}

export function usePokemonInitiativeMetadata({
  abilityQueries,
  importableRoles,
  isPokemonRule,
  ruleId,
}: UsePokemonInitiativeMetadataOptions) {
  const pokemonDefensiveByRoleId = useMemo(() => {
    const result = new Map<number, PokemonDefensiveMatchups>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const record = findRuleRecord(abilityQueries[idx], ruleId);
      if (!record)
        return;

      const source = getAbilitySource(record);
      const type1 = normalizePokemonTypeValue(source.属性1 ?? source.type1 ?? source.属性 ?? source.type);
      const type2 = normalizePokemonTypeValue(source.属性2 ?? source.type2);

      result.set(role.roleId, computePokemonDefensiveMatchups(type1, type2));
    });

    return result;
  }, [abilityQueries, importableRoles, isPokemonRule, ruleId]);

  const pokemonTraitByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const record = findRuleRecord(abilityQueries[idx], ruleId);
      if (!record)
        return;

      const source = getAbilitySource(record);
      const trait = source.特性 ?? source.ability;

      if (trait != null && String(trait).trim() !== "") {
        result.set(role.roleId, String(trait).trim());
      }
    });

    return result;
  }, [abilityQueries, importableRoles, isPokemonRule, ruleId]);

  const pokemonStatusByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const record = findRuleRecord(abilityQueries[idx], ruleId);
      if (!record)
        return;

      const source = getAbilitySource(record);
      const status = source.状态;
      if (status == null)
        return;

      const text = String(status).trim();
      if (!text || text === "0")
        return;

      const statusNumber = Number(text);
      if (Number.isFinite(statusNumber) && statusNumber === 0)
        return;

      result.set(role.roleId, text);
    });

    return result;
  }, [abilityQueries, importableRoles, isPokemonRule, ruleId]);

  const pokemonItemByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const record = findRuleRecord(abilityQueries[idx], ruleId);
      if (!record)
        return;

      const source = getAbilitySource(record);
      const itemTextRaw = source.道具;
      if (itemTextRaw == null)
        return;

      const text = String(itemTextRaw).trim();
      if (!text)
        return;

      result.set(role.roleId, text);
    });

    return result;
  }, [abilityQueries, importableRoles, isPokemonRule, ruleId]);

  const pokemonActionPointByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const query = abilityQueries[idx];
      const actionPoint = extractAttrFromQuery(ruleId, query, "行动点")
        ?? extractAttrFromQuery(ruleId, query, "行动值")
        ?? extractAttrFromQuery(ruleId, query, "AP")
        ?? extractAttrFromQuery(ruleId, query, "ap");

      if (actionPoint != null && String(actionPoint).trim() !== "") {
        result.set(role.roleId, String(actionPoint).trim());
      }
    });

    return result;
  }, [abilityQueries, importableRoles, isPokemonRule, ruleId]);

  return {
    pokemonDefensiveByRoleId,
    pokemonTraitByRoleId,
    pokemonStatusByRoleId,
    pokemonItemByRoleId,
    pokemonActionPointByRoleId,
  };
}

function resolveField(item: Initiative, key: SortKey): number | string | null {
  if (key === "name")
    return item.name ?? "";
  if (key === "value")
    return item.value ?? null;
  if (key === "hp")
    return item.hp ?? null;
  if (key === "maxHp")
    return item.maxHp ?? null;

  const paramKey = (key as { paramKey: string }).paramKey;
  const val = item.extras?.[paramKey];
  if (val == null)
    return null;
  if (typeof val === "number")
    return val;

  const num = Number(val);
  return Number.isFinite(num) ? num : String(val);
}

export function useSortedInitiativeList(
  initiativeList: Initiative[],
  sortKey: SortKey,
  sortDirection: SortDirection,
  spaceOwner: boolean,
) {
  const activeSortKey = spaceOwner ? sortKey : "value";
  const activeSortDirection = spaceOwner ? sortDirection : "desc";

  return useMemo(() => {
    const list = [...initiativeList];
    list.sort((a, b) => {
      const aVal = resolveField(a, activeSortKey);
      const bVal = resolveField(b, activeSortKey);

      if (aVal == null && bVal == null)
        return 0;
      if (aVal == null)
        return 1;
      if (bVal == null)
        return -1;

      const dir = activeSortDirection === "asc" ? 1 : -1;

      const aNum = typeof aVal === "number" ? aVal : Number(aVal);
      const bNum = typeof bVal === "number" ? bVal : Number(bVal);

      const aIsNum = Number.isFinite(aNum);
      const bIsNum = Number.isFinite(bNum);

      if (aIsNum && bIsNum) {
        if (aNum === bNum)
          return 0;
        return aNum > bNum ? dir : -dir;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr === bStr)
        return 0;
      return aStr > bStr ? dir : -dir;
    });
    return list;
  }, [initiativeList, activeSortKey, activeSortDirection]);
}
