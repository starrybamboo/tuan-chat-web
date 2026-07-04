import { describe, expect, it } from "vitest";

import type { Message } from "../../../../api";

import {
  buildMessageHistoryPatchRequest,
  getMessageHistoryPatchFallbackMessage,
} from "./messageHistoryMutation";

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    content: "content",
    messageId: 1,
    messageType: 1,
    position: 1,
    roomId: 10,
    status: 0,
    syncId: 100,
    userId: 20,
    ...overrides,
  };
}

describe("messageHistoryMutation", () => {
  it("撤销发送时构造 delete patch 并标记 undo", () => {
    const request = buildMessageHistoryPatchRequest({
      type: "send",
      after: createMessage({ messageId: 11 }),
    }, "undo");

    expect(request).toEqual({
      mutationMeta: {
        operationCause: "undo",
        sourceSurface: "message_editor",
      },
      operations: [{
        messageId: 11,
        op: "delete",
      }],
    });
  });

  it("重做删除时构造 delete patch 并标记 redo", () => {
    const request = buildMessageHistoryPatchRequest({
      type: "delete",
      before: createMessage({ messageId: 12 }),
    }, "redo");

    expect(request).toEqual({
      mutationMeta: {
        operationCause: "redo",
        sourceSurface: "message_editor",
      },
      operations: [{
        messageId: 12,
        op: "delete",
      }],
    });
  });

  it("撤销和重做修改时使用对应 before/after 快照", () => {
    const before = createMessage({ content: "before", messageId: 13, replyMessageId: 9 });
    const after = createMessage({ content: "after", messageId: 13, roleId: 8 });

    expect(buildMessageHistoryPatchRequest({ type: "update", before, after }, "undo").operations[0]).toMatchObject({
      messageId: 13,
      message: {
        content: "before",
        replayMessageId: 9,
      },
      op: "update",
    });
    expect(buildMessageHistoryPatchRequest({ type: "update", before, after }, "redo").operations[0]).toMatchObject({
      messageId: 13,
      message: {
        content: "after",
        roleId: 8,
      },
      op: "update",
    });
  });

  it("patch 响应缺少消息时按 undo/redo 动作提供兼容 fallback", () => {
    const sent = createMessage({ messageId: 14, status: 0 });
    expect(getMessageHistoryPatchFallbackMessage({ type: "send", after: sent }, "undo")).toMatchObject({
      messageId: 14,
      status: 1,
    });
    expect(getMessageHistoryPatchFallbackMessage({ type: "send", after: sent }, "redo")).toMatchObject({
      messageId: 14,
      status: 0,
    });
  });
});
