import type { MessageDirectResponse, MessageDirectSendRequest } from "../../../../api";

import { describe, expect, it, vi } from "vitest";

import { sendDirectMessageWithOptimisticRollback, withPrivateReplyMessageId } from "./usePrivateMessageSender";

function createDirectRequest(): MessageDirectSendRequest {
  return {
    content: "hello",
    extra: {},
    messageType: 1,
    receiverId: 8,
  };
}

describe("sendDirectMessageWithOptimisticRollback", () => {
  it("sendWithResult 返回 false 时移除已写入的乐观私聊消息", async () => {
    const request = createDirectRequest();
    const webSocketUtils = {
      pushOptimisticDirectMessage: vi.fn(() => -1),
      removeOptimisticDirectMessage: vi.fn(),
      sendWithResult: vi.fn(async () => false),
    };

    await expect(sendDirectMessageWithOptimisticRollback(webSocketUtils, request)).resolves.toBe(false);

    expect(webSocketUtils.sendWithResult).toHaveBeenCalledWith({ type: 5, data: request });
    expect(webSocketUtils.removeOptimisticDirectMessage).toHaveBeenCalledWith(-1);
  });

  it("sendWithResult 抛错时也移除已写入的乐观私聊消息", async () => {
    const request = createDirectRequest();
    const error = new Error("socket send failed");
    const webSocketUtils = {
      pushOptimisticDirectMessage: vi.fn(() => -1),
      removeOptimisticDirectMessage: vi.fn(),
      sendWithResult: vi.fn(async () => {
        throw error;
      }),
    };

    await expect(sendDirectMessageWithOptimisticRollback(webSocketUtils, request)).rejects.toThrow(error);

    expect(webSocketUtils.removeOptimisticDirectMessage).toHaveBeenCalledWith(-1);
  });

  it("没有生成乐观消息时不执行回滚删除", async () => {
    const webSocketUtils = {
      pushOptimisticDirectMessage: vi.fn(() => null),
      removeOptimisticDirectMessage: vi.fn(),
      sendWithResult: vi.fn(async () => false),
    };

    await expect(sendDirectMessageWithOptimisticRollback(webSocketUtils, createDirectRequest())).resolves.toBe(false);

    expect(webSocketUtils.removeOptimisticDirectMessage).not.toHaveBeenCalled();
  });
});

describe("withPrivateReplyMessageId", () => {
  it("只给有效回复目标追加 replyMessageId", () => {
    const request = createDirectRequest();

    expect(withPrivateReplyMessageId(request, { messageId: 88 } as MessageDirectResponse)).toEqual({
      ...request,
      replyMessageId: 88,
    });
    expect(withPrivateReplyMessageId(request, { messageId: -1 } as MessageDirectResponse)).toBe(request);
    expect(withPrivateReplyMessageId(request, null)).toBe(request);
  });
});
