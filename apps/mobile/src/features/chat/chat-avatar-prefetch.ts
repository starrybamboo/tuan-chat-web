import type { Message } from "@tuanchat/openapi-client/models/Message";

import { avatarThumbUrl } from "../../lib/media-url";

/**
 * 收集当前消息列表里需要预取的唯一头像 URL。
 */
export function collectChatAvatarThumbUrls(messages: readonly Message[]) {
  const seenAvatarFileIds = new Set<number>();
  const urls: string[] = [];

  for (const message of messages) {
    const avatarFileId = message.avatarFileId;
    if (typeof avatarFileId !== "number" || !Number.isInteger(avatarFileId) || avatarFileId <= 0 || seenAvatarFileIds.has(avatarFileId)) {
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
