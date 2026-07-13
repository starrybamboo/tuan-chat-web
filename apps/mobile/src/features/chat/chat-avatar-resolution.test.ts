import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import { selectChatMessagePrefetchWindow } from "./chat-avatar-prefetch";
import {
  buildDeferredChatMetadataRequest,
  collectUnresolvedOocUserIds,
  collectUnresolvedRoleAvatarIds,
  isMessageAvatarCoveredByMetadataRequest,
} from "./chat-avatar-resolution";
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

  it("批量请求会包含窗口内超过六个缺失头像和用户", () => {
    const roleMessages = Array.from({ length: 8 }, (_, index) => message({
      avatarId: index + 1,
      messageId: index + 1,
      roleId: index + 1,
    }));
    const oocMessages = Array.from({ length: 8 }, (_, index) => message({
      content: `(用户 ${index + 1})`,
      messageId: index + 20,
      userId: index + 11,
    }));

    const request = buildDeferredChatMetadataRequest(
      [...roleMessages, ...oocMessages],
      new Map(),
      new Set([11]),
    );

    expect(request.avatarIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(request.userIds).toEqual([12, 13, 14, 15, 16, 17, 18]);
  });

  it("只让当前批量请求负责已纳入的消息头像", () => {
    const roleMessage = message({ avatarId: 8, messageId: 1, roleId: 8 });
    const oldRoleMessage = message({ avatarId: 9, messageId: 2, roleId: 9 });
    const oocMessage = message({ content: "(场外)", messageId: 3, userId: 12 });

    expect(isMessageAvatarCoveredByMetadataRequest(
      roleMessage,
      new Map(),
      new Set([8]),
      new Set([12]),
    )).toBe(true);
    expect(isMessageAvatarCoveredByMetadataRequest(
      oldRoleMessage,
      new Map(),
      new Set([8]),
      new Set([12]),
    )).toBe(false);
    expect(isMessageAvatarCoveredByMetadataRequest(
      oocMessage,
      new Map(),
      new Set([8]),
      new Set([12]),
    )).toBe(true);
  });
});
