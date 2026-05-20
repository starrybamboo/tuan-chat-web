import { describe, expect, it } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import type { DmConversation } from "./useDmInboxQuery";

import { normalizeDmConversations, sortDmConversations } from "./dmConversationListModel";

function createMessage(overrides: Partial<MessageDirectResponse>): MessageDirectResponse {
  return {
    content: "hello",
    createTime: "2026-05-17T00:00:00.000Z",
    messageId: 1,
    messageType: 1,
    receiverId: 7,
    receiverUsername: "我",
    senderId: 42,
    senderUsername: "Alice",
    status: 0,
    syncId: 1,
    userId: 7,
    ...overrides,
  };
}

function createConversation({
  contactId,
  lastMessage,
  ...overrides
}: Partial<DmConversation> & { contactId: number; lastMessage: MessageDirectResponse }): DmConversation {
  return {
    contactAvatarFileId: undefined,
    contactId,
    contactName: `用户 #${contactId}`,
    lastMessage,
    messages: [lastMessage],
    unreadCount: 0,
    ...overrides,
  };
}

describe("dmConversationListModel", () => {
  it("按最后消息倒序排序，同时间用 contactId 保持稳定", () => {
    const conversations = [
      createConversation({ contactId: 3, lastMessage: createMessage({ messageId: 3, syncId: 10 }) }),
      createConversation({ contactId: 1, lastMessage: createMessage({ messageId: 1, syncId: 11 }) }),
      createConversation({ contactId: 2, lastMessage: createMessage({ messageId: 2, syncId: 10 }) }),
    ];

    expect(sortDmConversations(conversations).map(item => item.contactId)).toEqual([1, 2, 3]);
  });

  it("按 contactId 去重并保留最新消息、联系人信息和未读数", () => {
    const staleMessage = createMessage({
      content: "old",
      messageId: 1,
      senderUsername: "Alice old",
      syncId: 1,
    });
    const latestMessage = createMessage({
      content: "new",
      messageId: 2,
      senderAvatarFileId: 88,
      senderUsername: "Alice new",
      syncId: 2,
    });
    const duplicateMessage = createMessage({
      content: "newer duplicate",
      messageId: 2,
      senderAvatarFileId: 89,
      senderUsername: "Alice newest",
      syncId: 2,
    });

    const conversations = normalizeDmConversations([
      createConversation({
        contactId: 42,
        contactName: "Alice old",
        lastMessage: staleMessage,
        messages: [staleMessage, latestMessage],
        unreadCount: 1,
      }),
      createConversation({
        contactAvatarFileId: 89,
        contactId: 42,
        contactName: "Alice newest",
        lastMessage: duplicateMessage,
        messages: [duplicateMessage],
        unreadCount: 3,
      }),
    ]);

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      contactAvatarFileId: 89,
      contactId: 42,
      contactName: "Alice newest",
      lastMessage: { content: "newer duplicate", messageId: 2 },
      unreadCount: 3,
    });
    expect(conversations[0].messages.map(message => message.messageId)).toEqual([1, 2]);
    expect(conversations[0].messages.at(-1)?.content).toBe("newer duplicate");
  });
});
