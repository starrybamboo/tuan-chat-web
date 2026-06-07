type ResolveRoleRuleSelectionParams = {
  spaceRuleId?: number | null;
  storedRuleId?: number | null;
  fallbackRuleId?: number;
};

function normalizePositiveRuleId(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export function resolveRoleRuleSelection({
  spaceRuleId,
  storedRuleId,
  fallbackRuleId = 1,
}: ResolveRoleRuleSelectionParams): number {
  return normalizePositiveRuleId(spaceRuleId)
    ?? normalizePositiveRuleId(storedRuleId)
    ?? normalizePositiveRuleId(fallbackRuleId)
    ?? 1;
}

export function shouldPersistRoleRuleSelection(spaceRuleId?: number | null): boolean {
  return normalizePositiveRuleId(spaceRuleId) == null;
}
