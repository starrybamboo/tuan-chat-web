import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { getMessageAuthorLabel } from "./index";

function createMessage(overrides: Partial<Message>): Message {
  return {
    content: "",
    messageId: 1,
    messageType: 1,
    roomId: 1,
    status: 0,
    userId: 7,
    ...overrides,
  };
}

describe("getMessageAuthorLabel", () => {
  it("returns customRoleName when present", () => {
    expect(getMessageAuthorLabel(createMessage({ customRoleName: "侦探福尔摩斯" }))).toBe("侦探福尔摩斯");
  });

  it("trims customRoleName", () => {
    expect(getMessageAuthorLabel(createMessage({ customRoleName: "  侦探  " }))).toBe("侦探");
  });

  it("falls back to role ID when customRoleName is empty", () => {
    expect(getMessageAuthorLabel(createMessage({ customRoleName: "", roleId: 42 }))).toBe("角色 #42");
  });

  it("falls back to role ID when customRoleName is whitespace", () => {
    expect(getMessageAuthorLabel(createMessage({ customRoleName: "   ", roleId: 5 }))).toBe("角色 #5");
  });

  it("falls back to user ID when no role info", () => {
    expect(getMessageAuthorLabel(createMessage({ customRoleName: "", roleId: 0, userId: 7 }))).toBe("用户 #7");
  });

  it("falls back to user ID when roleId is undefined", () => {
    expect(getMessageAuthorLabel(createMessage({ userId: 99 }))).toBe("用户 #99");
  });
});
