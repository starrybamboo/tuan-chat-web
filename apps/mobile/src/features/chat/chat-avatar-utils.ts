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

export function resolveMessageDirectAvatarFileId(message: Pick<Message, "avatarFileId">) {
  if (isPositiveInteger(message.avatarFileId)) {
    return message.avatarFileId;
  }

  return null;
}

export function resolveRoleDefaultAvatarFileId(message: Pick<Message, "roleId">, roomRolesById?: RoomRolesById) {
  if (isPositiveInteger(message.roleId)) {
    const roleAvatarFileId = roomRolesById?.get(message.roleId)?.avatarFileId;
    if (isPositiveInteger(roleAvatarFileId)) {
      return roleAvatarFileId;
    }
  }

  return null;
}

export function resolveMessageDirectAvatarId(message: Pick<Message, "avatarId">) {
  if (isPositiveInteger(message.avatarId)) {
    return message.avatarId;
  }

  return null;
}

export function resolveRoleDefaultAvatarId(message: Pick<Message, "roleId">, roomRolesById?: RoomRolesById) {
  if (isPositiveInteger(message.roleId)) {
    const roleAvatarId = roomRolesById?.get(message.roleId)?.avatarId;
    if (isPositiveInteger(roleAvatarId)) {
      return roleAvatarId;
    }
  }

  return null;
}

export function resolveMessageAvatarFileId(message: Pick<Message, "avatarFileId" | "avatarId" | "roleId">, roomRolesById?: RoomRolesById) {
  const directAvatarFileId = resolveMessageDirectAvatarFileId(message);
  if (directAvatarFileId != null) {
    return directAvatarFileId;
  }

  if (resolveMessageDirectAvatarId(message) != null) {
    return null;
  }

  return resolveRoleDefaultAvatarFileId(message, roomRolesById);
}

export function resolveMessageAvatarId(message: Pick<Message, "avatarId" | "roleId">, roomRolesById?: RoomRolesById) {
  const directAvatarId = resolveMessageDirectAvatarId(message);
  if (directAvatarId != null) {
    return directAvatarId;
  }

  return resolveRoleDefaultAvatarId(message, roomRolesById);
}

export function resolveMessageAvatarUrl(message: Pick<Message, "avatarFileId" | "avatarId" | "roleId">, roomRolesById?: RoomRolesById) {
  const avatarFileId = resolveMessageAvatarFileId(message, roomRolesById);
  return avatarFileId ? avatarThumbUrl(avatarFileId) : null;
}
