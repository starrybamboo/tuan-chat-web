import type { ComponentProps } from "react";
import type { RoleAvatarSource } from "./roleAccess.shared";

import { getRoleAvatarComponentProps } from "./roleAccess.shared";
import RoleAvatarComponent from "./roleAvatar";

type RoleAvatarByRoleProps = Omit<
  ComponentProps<typeof RoleAvatarComponent>,
  "avatarId" | "avatarUrl" | "avatarThumbUrl" | "roleId" | "roleType" | "roleOwnerUserId" | "roleState"
> & {
  role?: RoleAvatarSource | null;
};

export function RoleAvatarByRole({ role, ...props }: RoleAvatarByRoleProps) {
  return <RoleAvatarComponent {...getRoleAvatarComponentProps(role)} {...props} />;
}
