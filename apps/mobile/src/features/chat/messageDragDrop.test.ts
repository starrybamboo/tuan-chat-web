import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { resolveMessageDropTarget } from "./messageDragDrop";

function createMessage(messageId: number): Message {
  return {
    content: `message-${messageId}`,
    messageId,
    messageType: 1,
    position: messageId,
    roomId: 7,
    status: 0,
    syncId: messageId,
    userId: 42,
  };
}

describe("resolveMessageDropTarget", () => {
  it("把目标行上半区解析为 before", () => {
    const target = resolveMessageDropTarget({
      candidates: [{ height: 80, message: createMessage(2), pageY: 200 }],
      draggingMessageId: 1,
      pointerPageY: 220,
    });

    expect(target).toMatchObject({ message: { messageId: 2 }, placement: "before" });
  });

  it("把目标行下半区解析为 after", () => {
    const target = resolveMessageDropTarget({
      candidates: [{ height: 80, message: createMessage(2), pageY: 200 }],
      draggingMessageId: 1,
      pointerPageY: 270,
    });

    expect(target).toMatchObject({ message: { messageId: 2 }, placement: "after" });
  });

  it("忽略正在拖动的消息并选择最近目标", () => {
    const target = resolveMessageDropTarget({
      candidates: [
        { height: 60, message: createMessage(1), pageY: 100 },
        { height: 60, message: createMessage(2), pageY: 200 },
        { height: 60, message: createMessage(3), pageY: 300 },
      ],
      draggingMessageId: 1,
      pointerPageY: 285,
    });

    expect(target).toMatchObject({ message: { messageId: 3 }, placement: "before" });
  });
});
