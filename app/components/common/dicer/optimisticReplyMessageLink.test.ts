import { describe, expect, it, vi } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import { collectOptimisticReplyMessageReplacements, syncOptimisticReplyMessageIds } from "./optimisticReplyMessageLink";

function createMessage(messageId: number, replyMessageId?: number | null): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId: 3,
      content: "骰子消息",
      status: 0,
      messageType: 2,
      position: messageId,
      replyMessageId: replyMessageId ?? undefined,
      createTime: "2026-04-14 20:00:00",
      updateTime: "2026-04-14 20:00:00",
      __tcStableKey: `stable:${messageId}`,
    } as ChatMessageResponse["message"],
  };
}

describe("optimisticReplyMessageLink", () => {
  it("只同步仍然指向旧临时指令消息的乐观回复", () => {
    const replacements = collectOptimisticReplyMessageReplacements({
      messages: [
        createMessage(-2, -1),
        createMessage(-3, -1),
        createMessage(-4, 88),
      ],
      pendingMessages: [
        { optimisticMessageId: -2 },
        { optimisticMessageId: -3 },
        { optimisticMessageId: -4 },
        null,
      ],
      fromReplyMessageId: -1,
      toReplyMessageId: 101,
    });

    expect(replacements).toHaveLength(2);
    expect(replacements).toEqual([
      expect.objectContaining({
        fromMessageId: -2,
        nextMessage: expect.objectContaining({
          message: expect.objectContaining({
            messageId: -2,
            replyMessageId: 101,
            __tcStableKey: "stable:-2",
          }),
        }),
      }),
      expect.objectContaining({
        fromMessageId: -3,
        nextMessage: expect.objectContaining({
          message: expect.objectContaining({
            messageId: -3,
            replyMessageId: 101,
            __tcStableKey: "stable:-3",
          }),
        }),
      }),
    ]);
  });

  it("会把匹配到的乐观消息回填到 chatHistory", async () => {
    const replaceMessageById = vi.fn(async () => {});

    await syncOptimisticReplyMessageIds({
      chatHistory: {
        messages: [
          createMessage(-2, -1),
          createMessage(-3, 88),
        ],
        replaceMessageById,
      },
      pendingMessages: [
        { optimisticMessageId: -2 },
        { optimisticMessageId: -3 },
      ],
      fromReplyMessageId: -1,
      toReplyMessageId: 101,
    });

    expect(replaceMessageById).toHaveBeenCalledTimes(1);
    expect(replaceMessageById).toHaveBeenCalledWith(-2, expect.objectContaining({
      message: expect.objectContaining({
        messageId: -2,
        replyMessageId: 101,
      }),
    }));
  });
});
