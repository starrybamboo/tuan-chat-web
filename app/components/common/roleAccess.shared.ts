import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { avatarThumbUrl as buildAvatarThumbUrl, avatarUrl as buildAvatarUrl } from "@/utils/mediaUrl";

import type { UserRole } from "../../../api";

import { useGetRoleAvatarQuery } from "../../../api/hooks/RoleAndAvatarHooks";

export type RoleAvatarSource = Pick<
  UserRole,
  "roleId" | "avatarId" | "avatarFileId" | "avatarMediaType" | "type" | "userId" | "state"
>;

export function getRoleAvatarComponentProps(role?: RoleAvatarSource | null) {
  return {
    avatarId: role?.avatarId ?? 0,
    avatarUrl: buildAvatarUrl(role?.avatarFileId),
    avatarThumbUrl: buildAvatarThumbUrl(role?.avatarFileId),
    roleId: role?.roleId,
    roleType: role?.type,
    roleOwnerUserId: role?.userId,
    roleState: role?.state,
  };
}

export function useResolvedRoleAvatarUrl(role?: RoleAvatarSource | null, fallbackUrl = ROLE_DEFAULT_AVATAR_URL) {
  const avatarId = role?.avatarId ?? 0;
  const avatarUrl = buildAvatarUrl(role?.avatarFileId);
  const avatarThumbUrl = buildAvatarThumbUrl(role?.avatarFileId);
  const hasProvidedAvatarUrl = Boolean(avatarThumbUrl || avatarUrl);
  const avatarQuery = useGetRoleAvatarQuery(avatarId, {
    enabled: avatarId > 0 && !hasProvidedAvatarUrl,
  });
  const queryAvatarFileId = avatarQuery.data?.data?.avatarFileId;
  return avatarThumbUrl
    || avatarUrl
    || buildAvatarThumbUrl(queryAvatarFileId)
    || buildAvatarUrl(queryAvatarFileId)
    || fallbackUrl;
}
