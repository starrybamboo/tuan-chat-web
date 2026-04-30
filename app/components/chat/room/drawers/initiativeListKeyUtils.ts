import type { InitiativeParam } from "./initiativeListTypes";

const RESERVED_KEYS = ["name", "value", "hp", "maxHp"] as const;

export function slugifyLabel(label: string): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "field";
}

export function makeUniqueKey(base: string, params: InitiativeParam[]): string {
  let key = base;
  let suffix = 2;
  while (RESERVED_KEYS.includes(key as any) || params.some(p => p.key === key)) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }
  return key;
}
