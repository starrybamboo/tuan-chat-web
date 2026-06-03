import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { getMobileMessageAuthorLabel, isNarratorMessage, isOutOfCharacterMessage, NARRATOR_AUTHOR_LABEL } from "./messageAuthorLabel";

function message(overrides: Partial<Message>): Message {
  return overrides as Message;
}

function rolesById(roles: Array<UserRole & { roleId: number }>) {
  return new Map(roles.map(role => [role.roleId, role]));
}

describe("messageAuthorLabel", () => {
  it("无角色消息默认显示旁白", () => {
    const narratorMessage = message({ roleId: 0 });

    expect(isNarratorMessage(narratorMessage)).toBe(true);
    expect(getMobileMessageAuthorLabel(narratorMessage)).toBe(NARRATOR_AUTHOR_LABEL);
  });

  it("无角色消息优先显示自定义名称", () => {
    expect(getMobileMessageAuthorLabel(message({ customRoleName: "  线索  " }))).toBe("线索");
  });

  it("括号包裹的无角色文本按场外发言处理", () => {
    const oocMessage = message({
      content: "(我就看看)",
      messageType: MESSAGE_TYPE.TEXT,
      roleId: -1,
      userId: 7,
    });

    expect(isOutOfCharacterMessage(oocMessage)).toBe(true);
    expect(isNarratorMessage(oocMessage)).toBe(false);
    expect(getMobileMessageAuthorLabel(oocMessage)).toBe("用户 #7");
  });

  it("有角色消息优先显示房间角色名", () => {
    const roomRolesById = rolesById([{ roleId: 32, roleName: "测试" } as UserRole]);

    expect(getMobileMessageAuthorLabel(message({ roleId: 32 }), roomRolesById)).toBe("测试");
  });

  it("角色缺失时使用调用方传入的兜底名称", () => {
    expect(getMobileMessageAuthorLabel(message({ roleId: 404 }), undefined, { unknownRoleLabel: "角色 #404" })).toBe("角色 #404");
  });
});
