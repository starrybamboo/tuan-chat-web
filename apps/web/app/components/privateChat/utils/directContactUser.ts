import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import type { MessageDirectType } from "../types/messageDirect";

export type DirectContactUser = Pick<FriendResponse, "avatarFileId" | "avatarMediaType" | "userId" | "username">;

function normalizeAvatarFileId(fileId: number | null | undefined): number | undefined {
  return typeof fileId === "number" && Number.isFinite(fileId) && fileId > 0 ? fileId : undefined;
}

export function getContactUserFromMessage(
  contactId: number,
  message: MessageDirectType | null,
): DirectContactUser {
  if (!message) {
    return { userId: contactId };
  }
  if (message.senderId === contactId) {
    return {
      userId: contactId,
      username: message.senderUsername,
      avatarFileId: normalizeAvatarFileId(message.senderAvatarFileId),
      avatarMediaType: message.senderAvatarMediaType,
    };
  }
  if (message.receiverId === contactId) {
    return {
      userId: contactId,
      username: message.receiverUsername,
      avatarFileId: normalizeAvatarFileId(message.receiverAvatarFileId),
      avatarMediaType: message.receiverAvatarMediaType,
    };
  }
  return { userId: contactId };
}

export function resolveDirectContactUser(
  contactId: number,
  friend: FriendResponse | undefined,
  message: MessageDirectType | null,
): DirectContactUser {
  const messageUser = getContactUserFromMessage(contactId, message);
  const messageAvatarFileId = normalizeAvatarFileId(messageUser.avatarFileId);
  const friendAvatarFileId = normalizeAvatarFileId(friend?.avatarFileId);

  return {
    userId: contactId,
    username: friend?.username?.trim() || messageUser.username,
    // 消息里的头像跟随私聊响应刷新，优先级高于可能滞后的好友列表缓存。
    avatarFileId: messageAvatarFileId ?? friendAvatarFileId,
    avatarMediaType: messageAvatarFileId ? messageUser.avatarMediaType : friend?.avatarMediaType,
  };
}
