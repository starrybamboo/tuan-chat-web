import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { describe, expect, it } from "vitest";

import { buildRoomRolesById } from "./chat-avatar-utils";
import { collectChatAvatarThumbUrls } from "./chat-avatar-prefetch";

function createMessage(avatarFileId?: number | null, roleId?: number | null): Message {
  return {
    avatarFileId: avatarFileId ?? undefined,
    roleId: roleId ?? undefined,
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

  it("会使用角色头像兜底", () => {
    const roomRolesById = buildRoomRolesById([
      { roleId: 8, avatarFileId: 21 } as UserRole,
    ]);

    expect(
      collectChatAvatarThumbUrls([
        createMessage(null, 8),
        createMessage(undefined, 8),
      ], roomRolesById),
    ).toEqual([
      "https://tuan.chat/media/v1/files/021/21/image/low.webp",
    ]);
  });
});
