import type { QueryClient } from "@tanstack/react-query";
import type { RoleAvatar } from "api";

import { tuanchat } from "@/../api/instance";
import { seedRoleAvatarQueryCaches } from "api/hooks/RoleAndAvatarHooks";

function mergeAvatarPatch(avatar: RoleAvatar, patch?: RoleAvatar | null): RoleAvatar {
  if (!patch) {
    return avatar;
  }

  return {
    ...avatar,
    ...patch,
  };
}

export async function ensureCreatedRoleDefaultAvatar(
  queryClient: QueryClient,
  roleId: number,
  avatarId: number,
): Promise<RoleAvatar | null> {
  const avatarRes = await tuanchat.avatarController.getRoleAvatar(avatarId);
  if (!avatarRes?.success || !avatarRes.data) {
    return null;
  }

  let nextAvatar: RoleAvatar = {
    ...avatarRes.data,
    roleId,
    avatarId,
  };

  if (nextAvatar.avatarFileId && !nextAvatar.spriteFileId) {
    const updateRes = await tuanchat.avatarController.updateRoleAvatar({
      ...nextAvatar,
      spriteFileId: nextAvatar.avatarFileId,
    });
    if (updateRes?.success) {
      nextAvatar = mergeAvatarPatch(nextAvatar, updateRes.data);
    }
  }

  seedRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
  return nextAvatar;
}
