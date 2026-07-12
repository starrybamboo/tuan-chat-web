import { describe, expect, it } from "vitest";

import type { UserRole } from "../../../../api";

import {
  CHAT_MENTION_SELECTED_CLASS,
  CHAT_MENTION_SELECTOR,
  segmentChatMentionContent,
} from "./chatMentionNode";

function createRole(roleId: number, roleName: string): UserRole {
  return {
    roleId,
    roleName,
    type: 0,
    userId: roleId,
  };
}

describe("segmentChatMentionContent", () => {
  it("按正文顺序把戳一戳双方转换为 mention 片段", () => {
    const initiator = createRole(1, "发起者");
    const target = createRole(2, "接受者");

    expect(segmentChatMentionContent("@发起者 戳了戳 @接受者", [
      { role: initiator, token: "@发起者" },
      { role: target, token: "@接受者" },
    ])).toEqual([
      { kind: "mention", role: initiator },
      { kind: "text", text: " 戳了戳 " },
      { kind: "mention", role: target },
    ]);
  });

  it("同名角色按传入顺序绑定到连续 mention", () => {
    const initiator = createRole(1, "同名角色");
    const target = createRole(2, "同名角色");

    expect(segmentChatMentionContent("@同名角色 戳了戳 @同名角色", [
      { role: initiator, token: "@同名角色" },
      { role: target, token: "@同名角色" },
    ])).toEqual([
      { kind: "mention", role: initiator },
      { kind: "text", text: " 戳了戳 " },
      { kind: "mention", role: target },
    ]);
  });

  it("用户删除 mention 后保留完整自定义正文", () => {
    expect(segmentChatMentionContent("轻轻碰了碰对方", [])).toEqual([
      { kind: "text", text: "轻轻碰了碰对方" },
    ]);
  });
});

describe("chat mention constants", () => {
  it("统一使用 mention 选择器和选中态类名", () => {
    expect(CHAT_MENTION_SELECTOR).toBe("span[data-role]");
    expect(CHAT_MENTION_SELECTED_CLASS).toBe("chat-at-mention--selected");
  });
});
