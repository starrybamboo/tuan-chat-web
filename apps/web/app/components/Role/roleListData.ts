import type { UserRole } from "api";

import type { Role } from "./types";

import { resolveRoleAvatarMedia } from "./sprite/roleAvatarMedia";

export type RoleListAvatarFields = UserRole;

type RoleAvatarSource = {
  avatarFileId?: number;
};

export function resolveRoleAvatarUrls(source?: RoleAvatarSource | null) {
  const media = resolveRoleAvatarMedia(source);
  const avatarUrl = media.avatar.url;
  const avatarThumbUrl = media.avatar.thumbUrl || avatarUrl;
  return {
    avatarUrl,
    avatarThumbUrl,
  };
}

export function mapUserRoleToRole(role: RoleListAvatarFields): Role {
  const { avatarUrl, avatarThumbUrl } = resolveRoleAvatarUrls(role);
  return {
    id: role.roleId || 0,
    name: role.roleName || "",
    description: role.description || "无描述",
    avatar: avatarUrl,
    avatarThumb: avatarThumbUrl,
    avatarId: role.avatarId || 0,
    voiceFileId: role.voiceFileId,
    type: role.type ?? 0,
    extra: role.extra || {},
  };
}

export function mergeRoleList(previousRoles: Role[], nextRoles: Role[]): Role[] {
  const previousById = new Map(
    previousRoles
      .filter(role => role.type !== 2)
      .map(role => [role.id, role]),
  );

  return nextRoles
    .filter(role => role.type !== 2)
    .map((role) => {
      const previousRole = previousById.get(role.id);
      if (!previousRole) {
        return role;
      }

      return {
        ...previousRole,
        ...role,
        avatar: role.avatar || previousRole.avatar,
        avatarThumb: role.avatarThumb || previousRole.avatarThumb || role.avatar,
      };
    });
}
