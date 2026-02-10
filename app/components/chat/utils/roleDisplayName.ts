type RoleDisplayNameParams = {
  roleId?: number | null;
  roleName?: string | null;
  customRoleName?: string | null;
  draftRoleName?: string | null;
  isIntroText?: boolean;
  isSpectator?: boolean;
  fallback?: string;
  spectatorLabel?: string;
};

export function getDisplayRoleName({
  roleId,
  roleName,
  customRoleName,
  draftRoleName,
  isIntroText = false,
  isSpectator = false,
  fallback = "未选择角色",
  spectatorLabel = "观战",
}: RoleDisplayNameParams): string {
  if (isSpectator) {
    return spectatorLabel;
  }
  if (isIntroText) {
    return "";
  }
  const normalizedRoleId = Number(roleId ?? 0);
  if (normalizedRoleId < 0) {
    return "";
  }
  const preferred = (customRoleName ?? draftRoleName ?? "").trim();
  if (preferred) {
    return preferred;
  }
  const baseName = (roleName ?? "").trim();
  if (baseName) {
    return baseName;
  }
  return fallback;
}
