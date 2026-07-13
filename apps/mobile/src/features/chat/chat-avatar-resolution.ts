import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { RoomRolesById } from "./chat-avatar-utils";

import { resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { isOutOfCharacterMessage } from "./messageAuthorLabel";

export type DeferredChatMetadataRequest = {
  avatarIds: number[];
  userIds: number[];
};

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

export function buildDeferredChatMetadataRequest(
  messages: readonly Message[],
  roomRolesById: RoomRolesById,
  knownOocAvatarUserIds: ReadonlySet<number>,
): DeferredChatMetadataRequest {
  return {
    avatarIds: collectUnresolvedRoleAvatarIds(messages, roomRolesById),
    userIds: collectUnresolvedOocUserIds(messages).filter(userId => !knownOocAvatarUserIds.has(userId)),
  };
}

export function isMessageAvatarCoveredByMetadataRequest(
  message: Message,
  roomRolesById: RoomRolesById,
  avatarIds: ReadonlySet<number>,
  userIds: ReadonlySet<number>,
): boolean {
  if (isOutOfCharacterMessage(message)) {
    return typeof message.userId === "number" && userIds.has(message.userId);
  }
  const avatarId = resolveMessageAvatarId(message, roomRolesById);
  return avatarId != null && avatarIds.has(avatarId);
}
