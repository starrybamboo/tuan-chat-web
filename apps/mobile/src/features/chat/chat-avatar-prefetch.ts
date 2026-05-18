import type { Message } from "@tuanchat/openapi-client/models/Message";

import { avatarThumbUrl } from "../../lib/media-url";
import { resolveMessageAvatarFileId, type RoomRolesById } from "./chat-avatar-utils";

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
