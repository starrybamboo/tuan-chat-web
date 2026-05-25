import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import {
  createOptimisticRoomMessage,
  getRoomMessageLocalRenderKey,
} from "@tuanchat/query/room-message-lifecycle";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

import {
  extractChatMessageResponses,
  fetchRoomMessagesWithLocalSync,
  upsertLiveRoomMessageWithGapRepair,
  upsertRoomMessagesToQueryAndDisk,
} from "./roomMessageSync";

function createRoomMessage(
  messageId: number,
  syncId = messageId,
  overrides: Partial<ChatMessageResponse["message"]> = {},
): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId,
      userId: 7,
      ...overrides,
    },
  };
}

function createQueryClientStub(initialMessages: ChatMessageResponse[] = []) {
  const data = new Map<string, RoomMessagesQueryData>();
  data.set(JSON.stringify(getAllRoomMessagesQueryKey(9)), initialMessages);

  return {
    getQueryData: vi.fn((queryKey: readonly unknown[]) => {
      return data.get(JSON.stringify(queryKey));
    }),
    setQueryData: vi.fn((queryKey: readonly unknown[], updater: (current: RoomMessagesQueryData) => RoomMessagesQueryData) => {
      const key = JSON.stringify(queryKey);
      data.set(key, updater(data.get(key)));
    }),
    snapshot: () => extractChatMessageResponses(data.get(JSON.stringify(getAllRoomMessagesQueryKey(9)))),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("roomMessageSync", () => {
  it("extractChatMessageResponses 支持 data 包裹和数组直返", () => {
    const message = createRoomMessage(1);

    expect(extractChatMessageResponses({ data: [message] })).toEqual([message]);
    expect(extractChatMessageResponses([message])).toEqual([message]);
    expect(extractChatMessageResponses({ data: null })).toEqual([]);
  });

  it("有本地 maxSyncId 时按 maxSyncId + 1 增量拉取", async () => {
    const historyMessages = [createRoomMessage(4)];
    const client = {
      chatController: {
        getAllMessage: vi.fn(),
        getHistoryMessages: vi.fn().mockResolvedValue({ data: historyMessages }),
      },
    };

    await expect(fetchRoomMessagesWithLocalSync(9, {
      client,
      getMaxCachedSyncId: vi.fn().mockResolvedValue(3),
    })).resolves.toEqual({
      messages: historyMessages,
      mode: "delta",
    });

    expect(client.chatController.getHistoryMessages).toHaveBeenCalledWith({
      roomId: 9,
      syncId: 4,
    });
    expect(client.chatController.getAllMessage).not.toHaveBeenCalled();
  });

  it("没有本地缓存时回退到全量消息接口", async () => {
    const allMessages = [createRoomMessage(1), createRoomMessage(2)];
    const client = {
      chatController: {
        getAllMessage: vi.fn().mockResolvedValue({ data: allMessages }),
        getHistoryMessages: vi.fn(),
      },
    };

    await expect(fetchRoomMessagesWithLocalSync(9, {
      client,
      getMaxCachedSyncId: vi.fn().mockResolvedValue(-1),
    })).resolves.toEqual({
      messages: allMessages,
      mode: "full",
    });

    expect(client.chatController.getAllMessage).toHaveBeenCalledWith(9);
    expect(client.chatController.getHistoryMessages).not.toHaveBeenCalled();
  });

  it("写入 query cache 时同步写入房间消息磁盘缓存", async () => {
    const queryClient = createQueryClientStub([createRoomMessage(1)]);
    const writeCachedRoomMessages = vi.fn().mockResolvedValue(undefined);
    const incoming = createRoomMessage(2);

    upsertRoomMessagesToQueryAndDisk(9, [incoming], {
      fetchHistoryMessages: vi.fn(),
      queryClient,
      writeCachedRoomMessages,
    });

    expect(queryClient.snapshot().map(item => item.message.messageId)).toEqual([1, 2]);
    expect(writeCachedRoomMessages).toHaveBeenCalledWith(9, [incoming]);
  });

  it("实时消息先到时移除匹配的乐观占位，避免列表短暂显示两条", () => {
    const optimistic = createOptimisticRoomMessage({
      content: "hello",
      extra: {},
      messageType: 1,
      roomId: 9,
      roleId: 2,
    }, {
      currentUserId: 7,
      optimisticId: -1,
      position: 2,
    });
    const optimisticRenderKey = getRoomMessageLocalRenderKey(optimistic.message);
    const queryClient = createQueryClientStub([createRoomMessage(1, 1), optimistic]);
    const writeCachedRoomMessages = vi.fn().mockResolvedValue(undefined);
    const incoming = createRoomMessage(50, 50, {
      content: "hello",
      position: 2,
      roleId: 2,
    });

    upsertRoomMessagesToQueryAndDisk(9, [incoming], {
      fetchHistoryMessages: vi.fn(),
      queryClient,
      writeCachedRoomMessages,
    });

    const messages = queryClient.snapshot();
    expect(messages.map(item => item.message.messageId)).toEqual([1, 50]);
    expect(getRoomMessageLocalRenderKey(messages[1].message)).toBe(optimisticRenderKey);
    expect(writeCachedRoomMessages).toHaveBeenCalledWith(9, [incoming]);
  });

  it("发现 sync gap 时补拉缺失消息并把实时消息和补洞消息都落盘", async () => {
    const queryClient = createQueryClientStub([createRoomMessage(1, 1)]);
    const missing = createRoomMessage(2, 2);
    const live = createRoomMessage(3, 3);
    const fetchHistoryMessages = vi.fn().mockResolvedValue([missing]);
    const writeCachedRoomMessages = vi.fn().mockResolvedValue(undefined);

    upsertLiveRoomMessageWithGapRepair(9, live, {
      fetchHistoryMessages,
      queryClient,
      writeCachedRoomMessages,
    });

    await vi.waitFor(() => {
      expect(queryClient.snapshot().map(item => item.message.messageId)).toEqual([1, 2, 3]);
    });

    expect(fetchHistoryMessages).toHaveBeenCalledWith(9, 2);
    expect(writeCachedRoomMessages).toHaveBeenCalledWith(9, [live]);
    expect(writeCachedRoomMessages).toHaveBeenCalledWith(9, [missing]);
  });
});
