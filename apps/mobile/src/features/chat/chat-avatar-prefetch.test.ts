import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { collectChatAvatarThumbUrls } from "./chat-avatar-prefetch";

function createMessage(avatarFileId?: number | null): Message {
  return {
    avatarFileId: avatarFileId ?? undefined,
  } as Message;
}

describe("collectChatAvatarThumbUrls", () => {
  it("会去重并忽略无效头像", () => {
    expect(
      collectChatAvatarThumbUrls([
        createMessage(7),
        createMessage(7),
        createMessage(12),
        createMessage(0),
        createMessage(null),
      ]),
    ).toEqual([
      "https://tuan.chat/media/v1/files/007/7/image/low.webp",
      "https://tuan.chat/media/v1/files/012/12/image/low.webp",
    ]);
  });
});
