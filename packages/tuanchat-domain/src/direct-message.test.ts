import { describe, expect, it } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import {
  buildDirectMessageSendRequestsFromUploadedMedia,
  getDirectMessagePreviewText,
  getDirectUnreadCount,
  groupDirectConversations,
  mergeDirectMessages,
} from "./direct-message";

function createDirectMessage(overrides: Partial<MessageDirectResponse>): MessageDirectResponse {
  return {
    content: "hello",
    createTime: "2026-05-17T00:00:00.000Z",
    messageId: 1,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId: 1,
    userId: 7,
    ...overrides,
  };
}

describe("direct message helpers", () => {
  it("按 messageId 去重并按 syncId 升序合并", () => {
    expect(mergeDirectMessages([
      createDirectMessage({ messageId: 2, syncId: 2, content: "old" }),
    ], [
      createDirectMessage({ messageId: 1, syncId: 1 }),
      createDirectMessage({ messageId: 2, syncId: 2, content: "new" }),
    ])).toEqual([
      createDirectMessage({ messageId: 1, syncId: 1 }),
      createDirectMessage({ messageId: 2, syncId: 2, content: "new" }),
    ]);
  });

  it("同一同步消息收到服务端确认后会替换旧项，避免重复气泡", () => {
    expect(mergeDirectMessages([
      createDirectMessage({ content: "pending", messageId: -1, syncId: 8 }),
    ], [
      createDirectMessage({ content: "confirmed", messageId: 88, syncId: 8 }),
    ])).toEqual([
      createDirectMessage({ content: "confirmed", messageId: 88, syncId: 8 }),
    ]);
  });

  it("同一 messageId 即使同步位置变化也只保留后到消息", () => {
    expect(mergeDirectMessages([
      createDirectMessage({ content: "old", messageId: 9, syncId: 7 }),
    ], [
      createDirectMessage({ content: "new", messageId: 9, syncId: 9 }),
    ])).toEqual([
      createDirectMessage({ content: "new", messageId: 9, syncId: 9 }),
    ]);
  });

  it("确认消息同时命中旧 messageId 和旧同步键时会合并成一条", () => {
    expect(mergeDirectMessages([
      createDirectMessage({ content: "server-old", messageId: 9, syncId: 7 }),
      createDirectMessage({ content: "pending", messageId: -1, syncId: 8 }),
    ], [
      createDirectMessage({ content: "confirmed", messageId: 9, syncId: 8 }),
    ])).toEqual([
      createDirectMessage({ content: "confirmed", messageId: 9, syncId: 8 }),
    ]);
  });

  it("同 syncId 的普通消息和已读线不会互相吞掉", () => {
    const message = createDirectMessage({ messageId: 8, senderId: 42, syncId: 8 });
    const readLine = createDirectMessage({
      messageId: -42,
      messageType: 10000,
      receiverId: 42,
      senderId: 7,
      syncId: 8,
    });

    expect(mergeDirectMessages([message], [readLine])).toEqual([message, readLine]);
  });

  it("基于已读线和乐观已读 sync 计算未读", () => {
    const messages = [
      createDirectMessage({ messageId: 1, senderId: 42, syncId: 1 }),
      createDirectMessage({ messageId: 2, senderId: 7, messageType: 10000, syncId: 2 }),
      createDirectMessage({ messageId: 3, senderId: 42, syncId: 3 }),
      createDirectMessage({ messageId: 4, senderId: 42, syncId: 4 }),
    ];

    expect(getDirectUnreadCount(messages, 42, 7)).toBe(2);
    expect(getDirectUnreadCount(messages, 42, 7, 3)).toBe(1);
  });

  it("按联系人聚合会话，并忽略只有已读线的会话", () => {
    const conversations = groupDirectConversations([
      createDirectMessage({ messageId: 1, senderId: 42, senderUsername: "Alice", syncId: 1 }),
      createDirectMessage({ messageId: 2, senderId: 7, receiverId: 42, syncId: 2 }),
      createDirectMessage({ messageId: 3, senderId: 99, receiverId: 7, messageType: 10000, syncId: 3 }),
    ], 7);

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      contactId: 42,
      contactName: "用户 #42",
      unreadCount: 1,
    });
  });

  it("联系人最后一条消息缺少头像时回溯使用最近可用头像", () => {
    const conversations = groupDirectConversations([
      createDirectMessage({
        messageId: 1,
        senderAvatarFileId: 88,
        senderId: 42,
        senderUsername: "Alice",
        syncId: 1,
      }),
      createDirectMessage({
        messageId: 2,
        receiverId: 42,
        receiverUsername: "Alice",
        senderId: 7,
        syncId: 2,
      }),
    ], 7);

    expect(conversations[0]).toMatchObject({
      contactAvatarFileId: 88,
      contactId: 42,
      contactName: "Alice",
      lastMessage: { messageId: 2 },
    });
  });

  it("会把已删除私聊消息转换成撤回预览", () => {
    expect(getDirectMessagePreviewText(createDirectMessage({ status: 1 }))).toBe("[消息已撤回]");
  });

  it("会把上传后的媒体草稿转换成私聊发送请求", () => {
    expect(buildDirectMessageSendRequestsFromUploadedMedia({
      inputText: "你好",
      receiverId: 99,
      replyMessageId: 8,
      uploadedImages: [{
        fileId: 12,
        fileName: "a.png",
        height: 600,
        mediaType: "image",
        size: 1024,
        width: 800,
      }],
    })).toEqual([
      {
        receiverId: 99,
        content: "你好",
        messageType: 2,
        extra: {
          imageMessage: {
            background: false,
            fileId: 12,
            fileName: "a.png",
            height: 600,
            mediaType: "image",
            size: 1024,
            width: 800,
          },
        },
        replyMessageId: 8,
      },
    ]);
  });
});
