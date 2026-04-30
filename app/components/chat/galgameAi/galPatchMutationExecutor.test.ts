import { describe, expect, it, vi } from "vitest";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { GalPatchMutationPlan } from "./galPatchMutationAdapter";

import { executeGalPatchMutationPlan } from "./galPatchMutationExecutor";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 99,
    roleId: 7,
    content: "内容",
    status: 0,
    messageType: 1,
    position: 1,
    ...overrides,
  };
}

function createRequest(overrides: Partial<ChatMessageRequest>): ChatMessageRequest {
  return {
    roomId: 10,
    roleId: 7,
    content: "新增",
    messageType: 1,
    position: 2,
    extra: {},
    ...overrides,
  };
}

describe("executeGalPatchMutationPlan", () => {
  it("按 update/delete/insert 顺序复用现有 mutation 回调", async () => {
    const order: string[] = [];
    const updateMessage = vi.fn(async (message: Message) => {
      order.push(`update:${message.messageId}`);
      return message;
    });
    const deleteMessage = vi.fn(async (messageId: number) => {
      order.push(`delete:${messageId}`);
      return createMessage({ messageId, status: 1 });
    });
    const sendMessages = vi.fn(async (messages: ChatMessageRequest[]) => {
      order.push(`insert:${messages.length}`);
      return messages.map((message, index) => createMessage({
        messageId: 100 + index,
        content: message.content,
        position: message.position,
      }));
    });

    const plan: GalPatchMutationPlan = {
      updateMessages: [createMessage({ messageId: 1, content: "改" })],
      deleteMessageIds: [2],
      insertMessages: [createRequest({ content: "补一条" })],
    };

    await expect(executeGalPatchMutationPlan(plan, {
      updateMessage,
      deleteMessage,
      sendMessages,
    })).resolves.toEqual({
      inserted: 1,
      updated: 1,
      deleted: 1,
    });
    expect(order).toEqual(["update:1", "delete:2", "insert:1"]);
  });

  it("新增返回数量不一致时抛错，避免误报应用成功", async () => {
    await expect(executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [],
      insertMessages: [createRequest({ content: "A" }), createRequest({ content: "B" })],
    }, {
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      sendMessages: vi.fn(async () => [createMessage({ messageId: 1 })]),
    })).rejects.toThrow("批量新增消息数量与 proposal 不一致");
  });
});
