import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

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
        avatarUrl: role.avatarUrl ?? previousData.avatarUrl,
        avatarThumbUrl: role.avatarThumbUrl ?? previousData.avatarThumbUrl,
      },
    };
  });

  if (!hasAvatarId(role)) {
    return;
  }

  const avatarUrl = role.avatarUrl?.trim() ?? "";
  const avatarThumbUrl = role.avatarThumbUrl?.trim() ?? "";
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
        avatarUrl: resolvedAvatarUrl,
        avatarThumbUrl: resolvedAvatarThumbUrl,
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

