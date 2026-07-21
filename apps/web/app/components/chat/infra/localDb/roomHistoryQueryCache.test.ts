import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../../api";

import {
  getRoomHistoryRuntime,
  getRoomMessagesFromQueryCache,
  resetRoomHistoryQueryRuntime,
  updateRoomMessagesQueryCache,
} from "./roomHistoryQueryCache";

function createMessage(messageId: number, roomId: number): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      messageId,
      messageType: 1,
      position: messageId,
      roomId,
      status: 0,
      syncId: messageId,
      userId: 7,
    },
  };
}

describe("roomHistoryQueryCache", () => {
  it("同一 QueryClient 的房间消费者共享消息数组，不同房间保持隔离", () => {
    const queryClient = new QueryClient();
    const firstRoomMessage = createMessage(1, 10);
    const secondRoomMessage = createMessage(2, 20);

    updateRoomMessagesQueryCache(queryClient, 10, current => [...current, firstRoomMessage]);
    updateRoomMessagesQueryCache(queryClient, 20, current => [...current, secondRoomMessage]);

    expect(getRoomMessagesFromQueryCache(queryClient, 10)).toEqual([firstRoomMessage]);
    expect(getRoomMessagesFromQueryCache(queryClient, 20)).toEqual([secondRoomMessage]);
  });

  it("共享 dirty 元数据会随 Query cache 重置而清除", () => {
    const queryClient = new QueryClient();
    getRoomHistoryRuntime(queryClient, 10).editorDirtyMessageIds.add(1);

    resetRoomHistoryQueryRuntime(queryClient);

    expect(getRoomHistoryRuntime(queryClient, 10).editorDirtyMessageIds).toEqual(new Set());
  });
});
