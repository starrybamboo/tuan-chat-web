import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";

import type { UserRole } from "../../../api";

import { useGetRoleAvatarQuery } from "../../../api/hooks/RoleAndAvatarHooks";

export type RoleAvatarSource = Pick<
  UserRole,
  "roleId" | "avatarId" | "avatarUrl" | "avatarThumbUrl" | "type" | "userId" | "state"
>;

export function getRoleAvatarComponentProps(role?: RoleAvatarSource | null) {
  return {
    avatarId: role?.avatarId ?? 0,
    avatarUrl: role?.avatarUrl,
    avatarThumbUrl: role?.avatarThumbUrl,
    roleId: role?.roleId,
    roleType: role?.type,
    roleOwnerUserId: role?.userId,
    roleState: role?.state,
  };
}

export function useResolvedRoleAvatarUrl(role?: RoleAvatarSource | null, fallbackUrl = ROLE_DEFAULT_AVATAR_URL) {
  const avatarId = role?.avatarId ?? 0;
  const avatarUrl = role?.avatarUrl?.trim() ?? "";
  const avatarThumbUrl = role?.avatarThumbUrl?.trim() ?? "";
  const hasProvidedAvatarUrl = Boolean(avatarThumbUrl || avatarUrl);
  const avatarQuery = useGetRoleAvatarQuery(avatarId, {
    enabled: avatarId > 0 && !hasProvidedAvatarUrl,
  });
  return avatarThumbUrl
    || avatarUrl
    || avatarQuery.data?.data?.avatarThumbUrl
    || avatarQuery.data?.data?.avatarUrl
    || fallbackUrl;
}
