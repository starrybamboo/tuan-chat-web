export type Initiative = {
  participantId: string;
  name: string;
  value: number;
  // 当前 HP 和最大 HP 可为空，空值表示未同步或未填写。
  hp?: number | null;
  maxHp?: number | null;
  extras?: Record<string, string | number | null>;
  roleId?: number;
  activeStates?: string[];
};

export type InitiativeParam = {
  key: string;
  label: string;
  source: "manual" | "roleAttr" | "stateKey";
  attrKey?: string;
  stateKey?: string;
};

export type InitiativeDraft = {
  name: string;
  value: string;
  hp: string;
  maxHp: string;
};

export type InitiativeParamDraft = {
  key: string;
  label: string;
  source: InitiativeParam["source"];
  attrKey: string;
  stateKey: string;
};

export type SortKey = "name" | "value" | "hp" | "maxHp" | { paramKey: string };
export type SortDirection = "asc" | "desc";
