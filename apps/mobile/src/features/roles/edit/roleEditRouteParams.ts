export type RoleEditRouteState
  = { kind: "create"; roleId: null }
    | { kind: "edit"; roleId: number }
    | { kind: "invalid"; roleId: null; rawRoleId: string };

function getFirstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveRoleEditRouteState(value: string | string[] | undefined): RoleEditRouteState {
  const rawValue = getFirstRouteParam(value);
  const normalizedValue = rawValue?.trim() ?? "";

  if (!normalizedValue) {
    return { kind: "create", roleId: null };
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return { kind: "invalid", roleId: null, rawRoleId: normalizedValue };
  }

  const parsed = Number(normalizedValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { kind: "invalid", roleId: null, rawRoleId: normalizedValue };
  }

  return { kind: "edit", roleId: parsed };
}
