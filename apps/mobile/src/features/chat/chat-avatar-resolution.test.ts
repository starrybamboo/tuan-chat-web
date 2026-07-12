import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import { selectChatMessagePrefetchWindow } from "./chat-avatar-prefetch";
import { collectUnresolvedOocUserIds, collectUnresolvedRoleAvatarIds } from "./chat-avatar-resolution";
import { buildRoomRolesById } from "./chat-avatar-utils";

function message(overrides: Partial<Message>): Message {
  return {
    messageType: MESSAGE_TYPE.TEXT,
    ...overrides,
  } as Message;
}

describe("chat-avatar-resolution", () => {
  it("只解析传入窗口内缺少文件 ID 的角色头像 ID", () => {
    const roomRolesById = buildRoomRolesById([
      { avatarId: 201, roleId: 2 } as UserRole,
      { avatarFileId: 301, avatarId: 302, roleId: 3 } as UserRole,
    ]);
    const recentMessages = selectChatMessagePrefetchWindow([
      message({ avatarId: 99, messageId: 1, roleId: 1 }),
      message({ messageId: 2, roleId: 2 }),
      message({ messageId: 3, roleId: 3 }),
      message({ avatarFileId: 401, avatarId: 402, messageId: 4, roleId: 4 }),
      message({ avatarId: 201, messageId: 5, roleId: 5 }),
    ], 4);

    expect(collectUnresolvedRoleAvatarIds(recentMessages, roomRolesById)).toEqual([201]);
  });

  it("跳过 OOC 消息并收集窗口内 OOC 用户头像查询 ID", () => {
    const recentMessages = selectChatMessagePrefetchWindow([
      message({ content: "(旧 OOC)", messageId: 1, userId: 10 }),
      message({ avatarId: 8, content: "角色发言", messageId: 2, roleId: 8, userId: 11 }),
      message({ content: "(新 OOC)", messageId: 3, userId: 12 }),
      message({ content: "（重复 OOC）", messageId: 4, userId: 12 }),
    ], 3);

    expect(collectUnresolvedRoleAvatarIds(recentMessages, new Map())).toEqual([8]);
    expect(collectUnresolvedOocUserIds(recentMessages)).toEqual([12]);
  });
});
