export type Initiative = {
  name: string;
  value: number;
  // 当前 HP 和最大 HP 可为空，空值表示未同步或未填写。
  hp?: number | null;
  maxHp?: number | null;
  extras?: Record<string, string | number | null>;
  roleId?: number;
};

export type InitiativeParam = {
  key: string;
  label: string;
  source: "manual" | "roleAttr";
  attrKey?: string;
};

export type SortKey = "name" | "value" | "hp" | "maxHp" | { paramKey: string };
export type SortDirection = "asc" | "desc";
