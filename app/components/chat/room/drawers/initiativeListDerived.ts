import { useMemo } from "react";

import type { Initiative, SortDirection, SortKey } from "./initiativeListTypes";

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
