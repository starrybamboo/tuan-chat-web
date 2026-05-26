export type RoleEditRouteState
  = { kind: "create"; roleId: null }
    | { kind: "edit"; roleId: number }
    | { kind: "invalid"; roleId: null; rawRoleId: string };

function getFirstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 解析可选的正整数路由参数，非法或缺失时返回 null。 */
export function resolveOptionalPositiveRouteParam(value: string | string[] | undefined): number | null {
  const rawValue = getFirstRouteParam(value);
  const normalizedValue = rawValue?.trim() ?? "";

  if (!normalizedValue || !/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** 根据 roleId 路由参数判定角色编辑页应进入创建、编辑或无效态。 */
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
