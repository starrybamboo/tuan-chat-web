import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { RoomRolesById } from "./chat-avatar-utils";

import { resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { isOutOfCharacterMessage } from "./messageAuthorLabel";

export function collectUnresolvedRoleAvatarIds(messages: readonly Message[], roomRolesById: RoomRolesById): number[] {
  const avatarIds = new Set<number>();
  for (const message of messages) {
    if (isOutOfCharacterMessage(message)) {
      continue;
    }
    if (resolveMessageAvatarFileId(message, roomRolesById) != null) {
      continue;
    }
    const avatarId = resolveMessageAvatarId(message, roomRolesById);
    if (avatarId != null) {
      avatarIds.add(avatarId);
    }
  }
  return [...avatarIds].sort((left, right) => left - right);
}

export function collectUnresolvedOocUserIds(messages: readonly Message[]): number[] {
  const userIds = new Set<number>();
  for (const message of messages) {
    if (!isOutOfCharacterMessage(message)) {
      continue;
    }
    if (typeof message.userId === "number" && message.userId > 0) {
      userIds.add(message.userId);
    }
  }
  return [...userIds].sort((left, right) => left - right);
}
