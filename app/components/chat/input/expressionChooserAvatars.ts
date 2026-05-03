import type { RoleAvatar, UserRole } from "../../../../api";

const DEFAULT_CATEGORY = "默认";

type ExpressionChooserRoleAvatarSource = Pick<UserRole, "roleId" | "avatarId" | "avatarFileId">;

export function resolveExpressionChooserRoleAvatars(
  roleAvatars: RoleAvatar[],
  selectedRole?: ExpressionChooserRoleAvatarSource,
): RoleAvatar[] {
  if (roleAvatars.length > 0) {
    return roleAvatars;
  }

  const avatarId = selectedRole?.avatarId ?? 0;
  const roleId = selectedRole?.roleId ?? 0;
  if (avatarId <= 0 || roleId <= 0) {
    return roleAvatars;
  }

  return [{
    avatarId,
    roleId,
    avatarFileId: selectedRole?.avatarFileId,
    category: DEFAULT_CATEGORY,
  }];
}
