import type { RoleAbility } from "../../../../api";

const ROLE_ABILITY_CACHE_TTL_MS = 10 * 60_000;

type ExpiringCacheEntry<T> = {
  value: T;
  expireAt: number;
};

const roleAbilityCache = new Map<string, ExpiringCacheEntry<RoleAbility>>();

function readCacheValue<T>(entry: ExpiringCacheEntry<T> | undefined): T | undefined {
  if (!entry) {
    return undefined;
  }
  if (entry.expireAt <= Date.now()) {
    return undefined;
  }
  return entry.value;
}

function writeCacheValue<T>(value: T, ttlMs: number): ExpiringCacheEntry<T> {
  return {
    value,
    expireAt: Date.now() + ttlMs,
  };
}

function cloneRoleAbility(ability: RoleAbility): RoleAbility {
  try {
    return JSON.parse(JSON.stringify(ability ?? {})) as RoleAbility;
  }
  catch {
    return {
      ...(ability ?? {}),
      act: { ...(ability?.act ?? {}) },
      basic: { ...(ability?.basic ?? {}) },
      ability: { ...(ability?.ability ?? {}) },
      skill: { ...(ability?.skill ?? {}) },
      record: { ...(ability?.record ?? {}) },
      extra: { ...(ability?.extra ?? {}) },
    } as RoleAbility;
  }
}

function buildRoleAbilityCacheKey(ruleId: number, roleId: number): string {
  return `${ruleId}:${roleId}`;
}

export function getCachedDicerRoleAbility(ruleId: number, roleId: number): RoleAbility | null {
  const cacheKey = buildRoleAbilityCacheKey(ruleId, roleId);
  const cached = readCacheValue(roleAbilityCache.get(cacheKey));
  if (!cached) {
    return null;
  }
  return cloneRoleAbility(cached);
}

export function setCachedDicerRoleAbility(ruleId: number, roleId: number, ability: RoleAbility): void {
  const cacheKey = buildRoleAbilityCacheKey(ruleId, roleId);
  roleAbilityCache.set(cacheKey, writeCacheValue(cloneRoleAbility(ability), ROLE_ABILITY_CACHE_TTL_MS));
}

export function invalidateDicerRoleAbilityCache(params?: { ruleId?: number; roleId?: number }): void {
  const ruleId = params?.ruleId;
  const roleId = params?.roleId;
  if (typeof ruleId === "number" && typeof roleId === "number") {
    roleAbilityCache.delete(buildRoleAbilityCacheKey(ruleId, roleId));
    return;
  }

  if (typeof ruleId !== "number" && typeof roleId !== "number") {
    roleAbilityCache.clear();
    return;
  }

  for (const key of roleAbilityCache.keys()) {
    const [cachedRuleId, cachedRoleId] = key.split(":").map(Number);
    if ((typeof ruleId === "number" && cachedRuleId !== ruleId)
      || (typeof roleId === "number" && cachedRoleId !== roleId)) {
      continue;
    }
    roleAbilityCache.delete(key);
  }
}
