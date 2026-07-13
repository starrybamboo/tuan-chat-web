import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import {
  collectChatAvatarThumbUrls,
  collectChatImageThumbUrls,
  collectResolvedChatAvatarThumbUrls,
  selectChatMessagePrefetchWindow,
} from "./chat-avatar-prefetch";
import { buildRoomRolesById } from "./chat-avatar-utils";

function createMessage(avatarFileId?: number | null, roleId?: number | null, imageFileId?: number | null): Message {
  return {
    avatarFileId: avatarFileId ?? undefined,
    extra: imageFileId == null
      ? {}
      : {
          imageMessage: {
            source: {
              kind: "internal",
              fileId: imageFileId,
            },
          },
        },
    messageType: imageFileId == null ? MESSAGE_TYPE.TEXT : MESSAGE_TYPE.IMG,
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
      "https://media.tuan.chat/media/v1/files/007/7/image/low.webp",
      "https://media.tuan.chat/media/v1/files/012/12/image/low.webp",
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
      "https://media.tuan.chat/media/v1/files/021/21/image/low.webp",
    ]);
  });

  it("会预取元数据补拉出的角色头像和 OOC 用户头像", () => {
    const roomRolesById = buildRoomRolesById([
      { avatarId: 21, roleId: 8 } as UserRole,
    ]);
    const messages = [
      { ...createMessage(null, 8), avatarId: 21, content: "角色发言", userId: 11 } as Message,
      { ...createMessage(), content: "(场外发言)", userId: 12 } as Message,
    ];

    expect(collectResolvedChatAvatarThumbUrls(
      messages,
      roomRolesById,
      new Map([[21, 41]]),
      new Map([[12, 51]]),
    )).toEqual([
      "https://media.tuan.chat/media/v1/files/041/41/image/low.webp",
      "https://media.tuan.chat/media/v1/files/051/51/image/low.webp",
    ]);
  });

  it("会去重并忽略无效图片缩略图", () => {
    expect(
      collectChatImageThumbUrls([
        createMessage(null, null, 11),
        createMessage(null, null, 11),
        createMessage(null, null, 22),
        createMessage(null, null, 0),
        createMessage(null, null, null),
      ]),
    ).toEqual([
      "https://media.tuan.chat/media/v1/files/011/11/image/medium.webp",
      "https://media.tuan.chat/media/v1/files/022/22/image/medium.webp",
    ]);
  });

  it("预取窗口只选择最近消息，避免长房间全量预取", () => {
    expect(selectChatMessagePrefetchWindow([1, 2, 3, 4, 5], 2)).toEqual([4, 5]);
    expect(selectChatMessagePrefetchWindow([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(selectChatMessagePrefetchWindow([1, 2, 3], 0)).toEqual([]);
  });
});
