import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearCachedDirectMessages,
  getCachedDirectConversationMaxSyncId,
  promotePendingDirectMessage,
  readCachedDirectConversationMessages,
  readCachedDirectInboxMessages,
  rollbackPendingDirectMessage,
  writeCachedDirectMessages,
  writePendingDirectMessage,
} from "./mobileDirectMessageCache";
import { createMobileOptimisticDirectMessage } from "./mobileDirectMessageOptimistic";

const repositoryMock = vi.hoisted(() => ({
  addPendingMessage: vi.fn(),
  clearUserMessages: vi.fn(),
  getMessagesByContact: vi.fn(),
  getMaxSyncIdByContact: vi.fn(),
  getMessagesByUser: vi.fn(),
  promotePendingMessage: vi.fn(),
  rollbackPendingMessage: vi.fn(),
  upsertMessages: vi.fn(),
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

    expect(repositoryMock.getMessagesByUser).toHaveBeenCalledWith(7, { limit: 240 });
    expect(repositoryMock.getMessagesByContact).toHaveBeenCalledWith(7, 42, { limit: 120 });
  });

  it("会把确认事件写入，并读取会话同步游标", async () => {
    const messages = [createDirectMessage(1)];
    repositoryMock.getMaxSyncIdByContact.mockResolvedValue(9);

    await writeCachedDirectMessages(7, messages);
    await expect(getCachedDirectConversationMaxSyncId(7, 42)).resolves.toBe(9);
    await clearCachedDirectMessages(7);

    expect(repositoryMock.upsertMessages).toHaveBeenCalledWith(7, messages);
    expect(repositoryMock.getMaxSyncIdByContact).toHaveBeenCalledWith(7, 42);
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

  it("发送前写入 pending，并可在确认或人工删除时原子收敛", async () => {
    const pending = createMobileOptimisticDirectMessage({
      currentUserId: 7,
      optimisticMessageId: -1,
      optimisticSyncId: 9001,
      request: {
        content: "optimistic",
        extra: {},
        messageType: 1,
        receiverId: 42,
      },
    })!;
    const confirmed = createDirectMessage(100);

    await writePendingDirectMessage(7, pending);
    await promotePendingDirectMessage(7, -1, confirmed);
    await rollbackPendingDirectMessage(7, -2);

    expect(repositoryMock.addPendingMessage).toHaveBeenCalledWith(7, pending);
    expect(repositoryMock.promotePendingMessage).toHaveBeenCalledWith(7, -1, confirmed);
    expect(repositoryMock.rollbackPendingMessage).toHaveBeenCalledWith(7, -2);
  });

  it("非法用户或空输入不会触发本地数据库", async () => {
    await expect(readCachedDirectInboxMessages(null)).resolves.toEqual([]);
    await expect(readCachedDirectConversationMessages(7, 0)).resolves.toEqual([]);
    await writeCachedDirectMessages(7, []);
    await expect(getCachedDirectConversationMaxSyncId(7, 0)).resolves.toBe(0);
    await clearCachedDirectMessages(undefined);

    expect(localDbMock.getMobileDirectMessageRepository).not.toHaveBeenCalled();
  });
});
