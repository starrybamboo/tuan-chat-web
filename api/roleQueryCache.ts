import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { avatarThumbUrl as buildAvatarThumbUrl, avatarUrl as buildAvatarUrl } from "@/utils/mediaUrl";

function hasRoleId(role?: UserRole | null): role is UserRole & { roleId: number } {
  return typeof role?.roleId === "number" && role.roleId > 0;
}

function hasAvatarId(role?: UserRole | null): role is UserRole & { avatarId: number } {
  return typeof role?.avatarId === "number" && role.avatarId > 0;
}

export function seedUserRoleQueryCache(queryClient: QueryClient, role?: UserRole | null): void {
  if (!hasRoleId(role)) {
    return;
  }

  queryClient.setQueryData(["getRole", role.roleId], (old: any) => {
    const previousData = old?.data ?? {};
    return {
      ...(old && typeof old === "object" ? old : {}),
      success: old?.success ?? true,
      data: {
        ...previousData,
        ...role,
      },
    };
  });

  if (!hasAvatarId(role)) {
    return;
  }

  const avatarUrl = buildAvatarUrl(role.avatarFileId);
  const avatarThumbUrl = buildAvatarThumbUrl(role.avatarFileId);
  if (!avatarUrl && !avatarThumbUrl) {
    return;
  }

  queryClient.setQueryData(["getRoleAvatar", role.avatarId], (old: any) => {
    const previousData = old?.data ?? {};
    const resolvedAvatarUrl = avatarUrl || previousData.avatarUrl || avatarThumbUrl;
    const resolvedAvatarThumbUrl = avatarThumbUrl || previousData.avatarThumbUrl || resolvedAvatarUrl;

    return {
      ...(old && typeof old === "object" ? old : {}),
      success: old?.success ?? true,
      data: {
        ...previousData,
        avatarId: role.avatarId,
        roleId: role.roleId,
        avatarFileId: role.avatarFileId,
        avatarMediaType: role.avatarMediaType,
        avatar: resolvedAvatarUrl,
        avatarThumb: resolvedAvatarThumbUrl,
      },
    };
  });
}

export function seedUserRoleListQueryCache(queryClient: QueryClient, roles?: Array<UserRole | null | undefined>): void {
  if (!Array.isArray(roles) || roles.length === 0) {
    return;
  }

  roles.forEach((role) => {
    seedUserRoleQueryCache(queryClient, role ?? null);
  });
}

