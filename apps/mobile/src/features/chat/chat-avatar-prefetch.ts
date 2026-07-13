import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getImageMessageExtra } from "@tuanchat/domain/message-extra";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { RoomRolesById } from "./chat-avatar-utils";

import { avatarThumbUrl, mediaFileUrl } from "../../lib/media-url";
import { resolveInternalMessageMediaFileId } from "../messages/messageMediaSource";
import { resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { isOutOfCharacterMessage } from "./messageAuthorLabel";

export const CHAT_MESSAGE_PREFETCH_WINDOW_SIZE = 40;

export function selectChatMessagePrefetchWindow<T>(
  messages: readonly T[],
  windowSize = CHAT_MESSAGE_PREFETCH_WINDOW_SIZE,
): T[] {
  if (windowSize <= 0) {
    return [];
  }
  return messages.slice(Math.max(0, messages.length - windowSize));
}

/**
 * 收集当前消息列表里需要预取的唯一头像 URL。
 */
export function collectChatAvatarThumbUrls(messages: readonly Message[], roomRolesById?: RoomRolesById) {
  const seenAvatarFileIds = new Set<number>();
  const urls: string[] = [];

  for (const message of messages) {
    const avatarFileId = resolveMessageAvatarFileId(message, roomRolesById);
    if (avatarFileId == null || seenAvatarFileIds.has(avatarFileId)) {
      continue;
    }

    seenAvatarFileIds.add(avatarFileId);
    const url = avatarThumbUrl(avatarFileId);
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

export function collectResolvedChatAvatarThumbUrls(
  messages: readonly Message[],
  roomRolesById: RoomRolesById,
  roleAvatarFileIdByAvatarId: ReadonlyMap<number, number>,
  userAvatarFileIdByUserId: ReadonlyMap<number, number>,
) {
  const avatarFileIds = new Set<number>();

  for (const message of messages) {
    if (isOutOfCharacterMessage(message)) {
      const userAvatarFileId = userAvatarFileIdByUserId.get(message.userId);
      if (userAvatarFileId != null) {
        avatarFileIds.add(userAvatarFileId);
      }
      continue;
    }
    if (resolveMessageAvatarFileId(message, roomRolesById) != null) {
      continue;
    }
    const avatarId = resolveMessageAvatarId(message, roomRolesById);
    const avatarFileId = avatarId == null ? undefined : roleAvatarFileIdByAvatarId.get(avatarId);
    if (avatarFileId != null) {
      avatarFileIds.add(avatarFileId);
    }
  }

  return [...avatarFileIds].flatMap((fileId) => {
    const url = avatarThumbUrl(fileId);
    return url ? [url] : [];
  });
}

/**
 * 收集当前消息列表里需要预取的唯一图片缩略图 URL。
 */
export function collectChatImageThumbUrls(messages: readonly Message[]) {
  const seenFileIds = new Set<number>();
  const urls: string[] = [];

  for (const message of messages) {
    if (message.messageType !== MESSAGE_TYPE.IMG) {
      continue;
    }

    const image = getImageMessageExtra(message.extra);
    const fileId = resolveInternalMessageMediaFileId(image);
    if (fileId == null || seenFileIds.has(fileId)) {
      continue;
    }

    seenFileIds.add(fileId);
    const url = mediaFileUrl(fileId, "image", "medium");
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}
