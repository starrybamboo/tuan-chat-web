import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

export type AvatarGridItem
  = { type: "avatar"; avatar: RoleAvatar; key: string }
    | { type: "add"; key: string };

export function buildAvatarGridItems(avatars: RoleAvatar[], manageMode: boolean, selectionMode: boolean): AvatarGridItem[] {
  return [
    ...avatars.map(avatar => ({
      type: "avatar" as const,
      avatar,
      key: `avatar:${avatar.avatarId ?? avatar.avatarFileId ?? "unknown"}`,
    })),
    ...(manageMode && !selectionMode ? [{ type: "add" as const, key: "avatar:add" }] : []),
  ];
}
