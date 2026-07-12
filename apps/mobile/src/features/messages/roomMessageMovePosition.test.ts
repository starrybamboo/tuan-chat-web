import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { resolveMovedRoomMessagePosition } from "./roomMessageMovePosition";

function createMessage(messageId: number, position: number): Message {
  return {
    content: `message-${messageId}`,
    messageId,
    messageType: 1,
    position,
    roomId: 7,
    status: 0,
    syncId: messageId,
    userId: 42,
  };
}

describe("resolveMovedRoomMessagePosition", () => {
  const first = createMessage(1, 10);
  const second = createMessage(2, 20);
  const third = createMessage(3, 30);
  const messages = [{ message: first }, { message: second }, { message: third }];

  it("计算目标消息之后的中间 position", () => {
    expect(resolveMovedRoomMessagePosition({
      messages,
      movingMessage: first,
      placement: "after",
      targetMessage: second,
    })).toBe(25);
  });

  it("计算目标消息之前的中间 position", () => {
    expect(resolveMovedRoomMessagePosition({
      messages,
      movingMessage: third,
      placement: "before",
      targetMessage: second,
    })).toBe(15);
  });

  it("移动到首尾时生成有限 position", () => {
    expect(resolveMovedRoomMessagePosition({
      messages,
      movingMessage: third,
      placement: "before",
      targetMessage: first,
    })).toBe(9);
    expect(resolveMovedRoomMessagePosition({
      messages,
      movingMessage: first,
      placement: "after",
      targetMessage: third,
    })).toBe(31);
  });

  it("目标消息缺失时抛出错误", () => {
    expect(() => resolveMovedRoomMessagePosition({
      messages,
      movingMessage: first,
      placement: "after",
      targetMessage: createMessage(99, 99),
    })).toThrow("找不到目标消息");
  });
});
