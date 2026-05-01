import type { UserInfoResponse } from "../../../api";

import { avatarThumbUrl, avatarUrl } from "@/utils/mediaUrl";
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";

export type UserAvatarSource = Pick<UserInfoResponse, "userId" | "username" | "avatarFileId" | "avatarMediaType">;

export function getUserAvatarComponentProps(user?: Partial<UserAvatarSource> | null) {
  return {
    userId: user?.userId ?? -1,
    username: user?.username,
    avatar: avatarUrl(user?.avatarFileId),
    avatarThumbUrl: avatarThumbUrl(user?.avatarFileId),
  };
}

export function resolveUserDisplayName(user?: Partial<UserAvatarSource> | null, fallbackName = "未知用户") {
  return user?.username?.trim() || fallbackName;
}

export function useResolvedUserInfo(user?: Partial<UserAvatarSource> | null, fallbackUserId?: number) {
  const userId = user?.userId ?? fallbackUserId ?? -1;
  const hasProvidedName = Boolean(user?.username?.trim());
  const hasProvidedAvatar = Boolean(user?.avatarFileId);
  const userQuery = useGetUserInfoQuery(userId, {
    enabled: userId > 0 && (!hasProvidedName || !hasProvidedAvatar),
  });
  const queryUser = userQuery.data?.data;
  const resolvedAvatarFileId = user?.avatarFileId ?? queryUser?.avatarFileId;

  return {
    userId,
    username: user?.username?.trim() || queryUser?.username || "",
    avatar: avatarUrl(resolvedAvatarFileId),
    avatarThumbUrl: avatarThumbUrl(resolvedAvatarFileId),
    isLoading: userQuery.isLoading,
  };
}
