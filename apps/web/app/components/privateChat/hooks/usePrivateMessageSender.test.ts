import type { MessageDirectResponse, MessageDirectSendRequest } from "../../../../api";

import { describe, expect, it, vi } from "vitest";

import { sendDirectMessageWithOptimisticRetention, withPrivateReplyMessageId } from "./usePrivateMessageSender";

function createDirectRequest(): MessageDirectSendRequest {
  return {
    content: "hello",
    extra: {},
    messageType: 1,
    receiverId: 8,
  };
}

describe("sendDirectMessageWithOptimisticRetention", () => {
  it("sendWithResult 返回 false 时保留并标记失败私聊消息", async () => {
    const request = createDirectRequest();
    const webSocketUtils = {
      markOptimisticDirectMessageFailed: vi.fn(),
      pushOptimisticDirectMessage: vi.fn(() => -1),
      sendWithResult: vi.fn(async () => false),
    };

    await expect(sendDirectMessageWithOptimisticRetention(webSocketUtils, request)).resolves.toBe(false);

    expect(webSocketUtils.sendWithResult).toHaveBeenCalledWith({ type: 5, data: request });
    expect(webSocketUtils.markOptimisticDirectMessageFailed).toHaveBeenCalledWith(-1);
  });

  it("sendWithResult 抛错时也保留并标记失败私聊消息", async () => {
    const request = createDirectRequest();
    const error = new Error("socket send failed");
    const webSocketUtils = {
      markOptimisticDirectMessageFailed: vi.fn(),
      pushOptimisticDirectMessage: vi.fn(() => -1),
      sendWithResult: vi.fn(async () => {
        throw error;
      }),
    };

    await expect(sendDirectMessageWithOptimisticRetention(webSocketUtils, request)).rejects.toThrow(error);

    expect(webSocketUtils.markOptimisticDirectMessageFailed).toHaveBeenCalledWith(-1);
  });

  it("没有生成乐观消息时不标记失败", async () => {
    const webSocketUtils = {
      markOptimisticDirectMessageFailed: vi.fn(),
      pushOptimisticDirectMessage: vi.fn(() => null),
      sendWithResult: vi.fn(async () => false),
    };

    await expect(sendDirectMessageWithOptimisticRetention(webSocketUtils, createDirectRequest())).resolves.toBe(false);

    expect(webSocketUtils.markOptimisticDirectMessageFailed).not.toHaveBeenCalled();
  });

  it("只在成功创建新乐观消息后通知重试方替换旧消息", async () => {
    const onOptimisticMessageCreated = vi.fn();
    const webSocketUtils = {
      markOptimisticDirectMessageFailed: vi.fn(),
      pushOptimisticDirectMessage: vi.fn(() => -2),
      sendWithResult: vi.fn(async () => true),
    };

    await sendDirectMessageWithOptimisticRetention(
      webSocketUtils,
      createDirectRequest(),
      onOptimisticMessageCreated,
    );

    expect(onOptimisticMessageCreated).toHaveBeenCalledWith(-2);
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
