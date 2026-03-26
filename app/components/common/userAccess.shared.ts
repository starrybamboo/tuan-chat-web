import type { UserInfoResponse } from "../../../api";

import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";

export type UserAvatarSource = Pick<UserInfoResponse, "userId" | "username" | "avatar" | "avatarThumbUrl">;

export function getUserAvatarComponentProps(user?: Partial<UserAvatarSource> | null) {
  return {
    userId: user?.userId ?? -1,
    username: user?.username,
    avatar: user?.avatar,
    avatarThumbUrl: user?.avatarThumbUrl,
  };
}

export function resolveUserDisplayName(user?: Partial<UserAvatarSource> | null, fallbackName = "未知用户") {
  return user?.username?.trim() || fallbackName;
}

export function useResolvedUserInfo(user?: Partial<UserAvatarSource> | null, fallbackUserId?: number) {
  const userId = user?.userId ?? fallbackUserId ?? -1;
  const hasProvidedName = Boolean(user?.username?.trim());
  const hasProvidedAvatar = Boolean(user?.avatarThumbUrl?.trim() || user?.avatar?.trim());
  const userQuery = useGetUserInfoQuery(userId, {
    enabled: userId > 0 && (!hasProvidedName || !hasProvidedAvatar),
  });
  const queryUser = userQuery.data?.data;

  return {
    userId,
    username: user?.username?.trim() || queryUser?.username || "",
    avatar: user?.avatar?.trim() || queryUser?.avatar || "",
    avatarThumbUrl: user?.avatarThumbUrl?.trim() || queryUser?.avatarThumbUrl || queryUser?.avatar || "",
    isLoading: userQuery.isLoading,
  };
}
