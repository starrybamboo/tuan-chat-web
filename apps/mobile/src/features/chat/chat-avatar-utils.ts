import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { avatarThumbUrl } from "../../lib/media-url";

export type RoomRolesById = ReadonlyMap<number, UserRole>;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function buildRoomRolesById(roomRoles: readonly UserRole[]) {
  const roomRolesById = new Map<number, UserRole>();
  for (const role of roomRoles) {
    if (isPositiveInteger(role.roleId)) {
      roomRolesById.set(role.roleId, role);
    }
  }
  return roomRolesById;
}

export function resolveMessageAvatarFileId(message: Pick<Message, "avatarFileId" | "roleId">, roomRolesById?: RoomRolesById) {
  if (isPositiveInteger(message.avatarFileId)) {
    return message.avatarFileId;
  }

  if (isPositiveInteger(message.roleId)) {
    const roleAvatarFileId = roomRolesById?.get(message.roleId)?.avatarFileId;
    if (isPositiveInteger(roleAvatarFileId)) {
      return roleAvatarFileId;
    }
  }

  return null;
}

export function resolveMessageAvatarUrl(message: Pick<Message, "avatarFileId" | "roleId">, roomRolesById?: RoomRolesById) {
  const avatarFileId = resolveMessageAvatarFileId(message, roomRolesById);
  return avatarFileId ? avatarThumbUrl(avatarFileId) : null;
}
