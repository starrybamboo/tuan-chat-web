import type { ComponentProps } from "react";
import type { UserRole } from "../../../api";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { useGetRoleAvatarQuery } from "../../../api/hooks/RoleAndAvatarHooks";
import RoleAvatarComponent from "./roleAvatar";

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

export function resolveRoleAvatarUrl(role?: RoleAvatarSource | null, fallbackUrl = ROLE_DEFAULT_AVATAR_URL) {
  return role?.avatarThumbUrl?.trim() || role?.avatarUrl?.trim() || fallbackUrl;
}

type RoleAvatarByRoleProps = Omit<
  ComponentProps<typeof RoleAvatarComponent>,
  "avatarId" | "avatarUrl" | "avatarThumbUrl" | "roleId" | "roleType" | "roleOwnerUserId" | "roleState"
> & {
  role?: RoleAvatarSource | null;
};

export function RoleAvatarByRole({ role, ...props }: RoleAvatarByRoleProps) {
  return <RoleAvatarComponent {...getRoleAvatarComponentProps(role)} {...props} />;
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
