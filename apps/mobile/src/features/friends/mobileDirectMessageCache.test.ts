import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import {
  clearCachedDirectMessages,
  markCachedDirectMessagesRecalled,
  readCachedDirectConversationMessages,
  readCachedDirectInboxMessages,
  upsertCachedDirectReadLine,
  writeCachedDirectMessages,
} from "./mobileDirectMessageCache";
import { createMobileOptimisticDirectMessage } from "./mobileDirectMessageOptimistic";

const repositoryMock = vi.hoisted(() => ({
  clearUserMessages: vi.fn(),
  getMessagesByContact: vi.fn(),
  getMessagesByUser: vi.fn(),
  markMessagesRecalled: vi.fn(),
  upsertMessages: vi.fn(),
  upsertReadLine: vi.fn(),
}));

const localDbMock = vi.hoisted(() => ({
  getMobileDirectMessageRepository: vi.fn(() => Promise.resolve(repositoryMock)),
}));

vi.mock("../../lib/mobile-local-db", () => localDbMock);

function createDirectMessage(messageId: number): MessageDirectResponse {
  return {
    content: `message-${messageId}`,
    messageId,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId: messageId,
    userId: 7,
  };
}

beforeEach(() => {
  localDbMock.getMobileDirectMessageRepository.mockClear();
  Object.values(repositoryMock).forEach(mock => mock.mockReset());
});

describe("mobileDirectMessageCache", () => {
  it("会按当前用户读取 inbox 和联系人切片缓存", async () => {
    const inboxMessages = [createDirectMessage(1)];
    const contactMessages = [createDirectMessage(2)];
    repositoryMock.getMessagesByUser.mockResolvedValue(inboxMessages);
    repositoryMock.getMessagesByContact.mockResolvedValue(contactMessages);

    await expect(readCachedDirectInboxMessages(7)).resolves.toBe(inboxMessages);
    await expect(readCachedDirectConversationMessages(7, 42)).resolves.toBe(contactMessages);

    expect(repositoryMock.getMessagesByUser).toHaveBeenCalledWith(7);
    expect(repositoryMock.getMessagesByContact).toHaveBeenCalledWith(7, 42);
  });

  it("会把写入、撤回、已读线和清理转发给 SQLite repository", async () => {
    const messages = [createDirectMessage(1)];

    await writeCachedDirectMessages(7, messages);
    await markCachedDirectMessagesRecalled(7, [1]);
    await upsertCachedDirectReadLine(7, 42, 9);
    await clearCachedDirectMessages(7);

    expect(repositoryMock.upsertMessages).toHaveBeenCalledWith(7, messages);
    expect(repositoryMock.markMessagesRecalled).toHaveBeenCalledWith(7, [1]);
    expect(repositoryMock.upsertReadLine).toHaveBeenCalledWith(7, 42, 9);
    expect(repositoryMock.clearUserMessages).toHaveBeenCalledWith(7);
  });

  it("写入磁盘缓存前会跳过私聊本地临时消息", async () => {
    const committed = createDirectMessage(1);
    const optimistic = createMobileOptimisticDirectMessage({
      currentUserId: 7,
      optimisticMessageId: -1,
      optimisticSyncId: 9001,
      request: {
        content: "optimistic",
        extra: {},
        messageType: 1,
        receiverId: 42,
      },
    });

    await writeCachedDirectMessages(7, [optimistic!, committed]);

    expect(repositoryMock.upsertMessages).toHaveBeenCalledWith(7, [committed]);
  });

  it("非法用户或空输入不会触发本地数据库", async () => {
    await expect(readCachedDirectInboxMessages(null)).resolves.toEqual([]);
    await expect(readCachedDirectConversationMessages(7, 0)).resolves.toEqual([]);
    await writeCachedDirectMessages(7, []);
    await markCachedDirectMessagesRecalled(7, []);
    await upsertCachedDirectReadLine(7, 42, 0);
    await clearCachedDirectMessages(undefined);

    expect(localDbMock.getMobileDirectMessageRepository).not.toHaveBeenCalled();
  });
});
