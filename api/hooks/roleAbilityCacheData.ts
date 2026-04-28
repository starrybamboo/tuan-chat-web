type RoleAbilityLike = Record<string, any>;

export type CachedRoleAbility = RoleAbilityLike & {
  abilityId: number;
  roleId: number;
  ruleId: number;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
  actTemplate: Record<string, string>;
  basicDefault: Record<string, string>;
  abilityDefault: Record<string, string>;
  skillDefault: Record<string, string>;
  extraCopywriting?: Record<string, string[]>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asStringRecord(value: unknown): Record<string, string> {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, String(item ?? "")]),
  );
}

function parseExtraCopywriting(extra: unknown): Record<string, string[]> | undefined {
  const copywriting = asRecord(extra).copywriting;
  if (typeof copywriting === "string") {
    try {
      const parsed = JSON.parse(copywriting);
      return asRecord(parsed) as Record<string, string[]>;
    }
    catch {
      return undefined;
    }
  }
  if (copywriting && typeof copywriting === "object" && !Array.isArray(copywriting)) {
    return copywriting as Record<string, string[]>;
  }
  return undefined;
}

/**
 * 同一个 React Query key 必须缓存同一种数据形状。
 * 角色详情使用 *Default 别名，房间状态运行时使用原始字段，这里统一补齐两边字段。
 */
export function normalizeRoleAbilityCacheData(
  raw: unknown,
  requested: { roleId: number; ruleId: number },
): CachedRoleAbility | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as RoleAbilityLike;
  const act = asStringRecord(data.act ?? data.actTemplate);
  const basic = asStringRecord(data.basic ?? data.basicDefault);
  const ability = asStringRecord(data.ability ?? data.abilityDefault);
  const skill = asStringRecord(data.skill ?? data.skillDefault);
  const extraCopywriting = parseExtraCopywriting(data.extra) ?? data.extraCopywriting;

  return {
    ...data,
    abilityId: Number(data.abilityId ?? 0),
    roleId: requested.roleId,
    ruleId: requested.ruleId,
    act,
    basic,
    ability,
    skill,
    actTemplate: act,
    basicDefault: basic,
    abilityDefault: ability,
    skillDefault: skill,
    extraCopywriting,
  };
}
