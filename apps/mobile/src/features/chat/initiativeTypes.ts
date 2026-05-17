/**
 * 移动端先攻表条目，直接对齐 Web 端房间 extra 结构。
 */
export type Initiative = {
  extras?: Record<string, string | number | null>;
  hp?: number | null;
  maxHp?: number | null;
  name: string;
  roleId?: number;
  value: number;
};

export type InitiativeDraft = {
  hp: string;
  maxHp: string;
  name: string;
  value: string;
};
