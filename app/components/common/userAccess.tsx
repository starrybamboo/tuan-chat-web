import type { ComponentProps } from "react";
import type { UserInfoResponse } from "../../../api";
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";
import UserAvatarComponent from "./userAvatar";

export type UserAvatarSource = Pick<UserInfoResponse, "userId" | "username" | "avatar" | "avatarThumbUrl">;

export function getUserAvatarComponentProps(user?: Partial<UserAvatarSource> | null) {
  return {
    userId: user?.userId ?? -1,
    username: user?.username,
    avatar: user?.avatar,
    avatarThumbUrl: user?.avatarThumbUrl,
  };
}

export function resolveUserAvatarUrl(user?: Partial<UserAvatarSource> | null, fallbackUrl = "") {
  return user?.avatarThumbUrl?.trim() || user?.avatar?.trim() || fallbackUrl;
}

export function resolveUserDisplayName(user?: Partial<UserAvatarSource> | null, fallbackName = "未知用户") {
  return user?.username?.trim() || fallbackName;
}

type UserAvatarByUserProps = Omit<ComponentProps<typeof UserAvatarComponent>, "userId" | "username" | "avatar" | "avatarThumbUrl"> & {
  user?: Partial<UserAvatarSource> | null;
  fallbackUserId?: number;
};

export function UserAvatarByUser({ user, fallbackUserId, ...props }: UserAvatarByUserProps) {
  return (
    <UserAvatarComponent
      {...getUserAvatarComponentProps({
        ...user,
        userId: user?.userId ?? fallbackUserId ?? -1,
      })}
      {...props}
    />
  );
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
