import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import {
  buildRoomRolesById,
  resolveMessageAvatarFileId,
  resolveMessageAvatarId,
  resolveMessageAvatarUrl,
} from "./chat-avatar-utils";

function message(overrides: Partial<Message>): Message {
  return overrides as Message;
}

function rolesById(roles: Array<UserRole & { roleId: number }>) {
  return buildRoomRolesById(roles);
}

describe("chat-avatar-utils", () => {
  it("消息头像文件优先于角色默认头像文件", () => {
    const roomRolesById = rolesById([
      { roleId: 8, avatarFileId: 21 } as UserRole & { roleId: number },
    ]);

    expect(resolveMessageAvatarFileId(message({ avatarFileId: 12, roleId: 8 }), roomRolesById)).toBe(12);
    expect(resolveMessageAvatarUrl(message({ avatarFileId: 12, roleId: 8 }), roomRolesById)).toBe("https://media.tuan.chat/media/v1/files/012/12/image/low.webp");
  });

  it("消息缺少头像文件时使用房间角色头像文件兜底", () => {
    const roomRolesById = rolesById([
      { roleId: 8, avatarFileId: 21 } as UserRole & { roleId: number },
    ]);

    expect(resolveMessageAvatarFileId(message({ roleId: 8 }), roomRolesById)).toBe(21);
  });

  it("消息头像 ID 优先于角色默认头像 ID", () => {
    const roomRolesById = rolesById([
      { roleId: 8, avatarId: 21 } as UserRole & { roleId: number },
    ]);

    expect(resolveMessageAvatarId(message({ avatarId: 12, roleId: 8 }), roomRolesById)).toBe(12);
  });

  it("消息缺少头像 ID 时使用房间角色头像 ID 兜底", () => {
    const roomRolesById = rolesById([
      { roleId: 8, avatarId: 21 } as UserRole & { roleId: number },
    ]);

    expect(resolveMessageAvatarId(message({ roleId: 8 }), roomRolesById)).toBe(21);
    expect(resolveMessageAvatarId(message({ avatarId: 0, roleId: 8 }), roomRolesById)).toBe(21);
  });
});
