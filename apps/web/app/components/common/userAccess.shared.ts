import { avatarUrl, imageLowUrl } from "@/utils/media/mediaUrl";

import type { UserInfoResponse } from "../../../api";

import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";

export type UserAvatarSource = Pick<UserInfoResponse, "userId" | "username" | "avatarFileId" | "avatarMediaType">;

function normalizeAvatarFileId(fileId: number | null | undefined): number | undefined {
  return typeof fileId === "number" && Number.isFinite(fileId) && fileId > 0 ? fileId : undefined;
}

export function getUserAvatarComponentProps(user?: Partial<UserAvatarSource> | null) {
  const avatarFileId = normalizeAvatarFileId(user?.avatarFileId);
  return {
    userId: user?.userId ?? -1,
    username: user?.username,
    avatar: avatarUrl(avatarFileId),
    avatarThumbUrl: imageLowUrl(avatarFileId),
  };
}

export function resolveUserDisplayName(user?: Partial<UserAvatarSource> | null, fallbackName = "未知用户") {
  return user?.username?.trim() || fallbackName;
}

export function useResolvedUserInfo(user?: Partial<UserAvatarSource> | null, fallbackUserId?: number) {
  const userId = user?.userId ?? fallbackUserId ?? -1;
  const hasProvidedName = Boolean(user?.username?.trim());
  const providedAvatarFileId = normalizeAvatarFileId(user?.avatarFileId);
  const hasProvidedAvatar = providedAvatarFileId != null;
  const userQuery = useGetUserInfoQuery(userId, {
    enabled: userId > 0 && (!hasProvidedName || !hasProvidedAvatar),
  });
  const queryUser = userQuery.data?.data;
  const resolvedAvatarFileId = providedAvatarFileId ?? normalizeAvatarFileId(queryUser?.avatarFileId);

  return {
    userId,
    username: user?.username?.trim() || queryUser?.username || "",
    avatar: avatarUrl(resolvedAvatarFileId),
    avatarThumbUrl: imageLowUrl(resolvedAvatarFileId),
    isLoading: userQuery.isLoading,
  };
}
