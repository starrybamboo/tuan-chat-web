import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getImageMessageExtra } from "@tuanchat/domain/message-extra";

import type { RoomRolesById } from "./chat-avatar-utils";

import { avatarThumbUrl, mediaFileUrl } from "../../lib/media-url";
import { resolveInternalMessageMediaFileId } from "../messages/messageMediaSource";
import { resolveMessageAvatarFileId } from "./chat-avatar-utils";

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
    const url = mediaFileUrl(fileId, "image", "low");
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}
