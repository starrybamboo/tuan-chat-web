import type { ComponentProps } from "react";
import type { UserAvatarSource } from "./userAccess.shared";

import { getUserAvatarComponentProps } from "./userAccess.shared";
import UserAvatarComponent from "./userAvatar";

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
