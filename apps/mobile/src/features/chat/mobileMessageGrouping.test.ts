import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import { shouldGroupWithPrevious } from "./mobileMessageGrouping";

function createMessage(messageType: number, overrides: Partial<Message> = {}): Message {
  return {
    avatarFileId: 13,
    avatarId: 11,
    messageType,
    roleId: 7,
    userId: 3,
    ...overrides,
  } as Message;
}

describe("shouldGroupWithPrevious", () => {
  it("相同身份的连续普通消息保持合并", () => {
    expect(shouldGroupWithPrevious(
      createMessage(MESSAGE_TYPE.TEXT),
      createMessage(MESSAGE_TYPE.TEXT),
    )).toBe(true);
  });

  it("POKE 作为当前消息时独立显示为系统行", () => {
    expect(shouldGroupWithPrevious(
      createMessage(MESSAGE_TYPE.POKE),
      createMessage(MESSAGE_TYPE.TEXT),
    )).toBe(false);
  });

  it("普通消息不会跨过前一条 POKE 继续合并", () => {
    expect(shouldGroupWithPrevious(
      createMessage(MESSAGE_TYPE.TEXT),
      createMessage(MESSAGE_TYPE.POKE),
    )).toBe(false);
  });
});
