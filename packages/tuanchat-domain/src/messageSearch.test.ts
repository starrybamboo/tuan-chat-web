import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { buildMessageSearchText } from "./messageSearch";
import { MESSAGE_TYPE } from "./messageType";

function createMessage(overrides: Partial<Message>): Message {
  return {
    content: "测试消息内容",
    messageId: 42,
    messageType: 1,
    roomId: 1,
    status: 0,
    userId: 7,
    ...overrides,
  };
}

describe("buildMessageSearchText", () => {
  it("includes author label in output", () => {
    const result = buildMessageSearchText(createMessage({ customRoleName: "侦探" }));
    expect(result).toContain("侦探");
  });

  it("includes message preview text in output", () => {
    const result = buildMessageSearchText(createMessage({ content: "这是一条消息" }));
    expect(result).toContain("这是一条消息");
  });

  it("includes message ID in output", () => {
    const result = buildMessageSearchText(createMessage({ messageId: 42 }));
    expect(result).toContain("消息 #42");
  });

  it("returns lowercase text", () => {
    const result = buildMessageSearchText(createMessage({ customRoleName: "ABC" }));
    expect(result).toContain("abc");
  });

  it("uses dash for missing messageId", () => {
    const result = buildMessageSearchText(createMessage({ messageId: undefined as unknown as number }));
    expect(result).toContain("消息 #-");
  });

  it("uses poke preview text in search index", () => {
    const result = buildMessageSearchText(createMessage({
      content: "@爱丽丝 戳了戳 @鲍勃",
      messageType: MESSAGE_TYPE.POKE,
      extra: { poke: { targetRoleId: 9 } },
    }));

    expect(result).toContain("[戳一戳] @爱丽丝 戳了戳 @鲍勃");
  });
});
