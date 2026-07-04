import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { getAllRoomMessagesQueryKey } from "./chat";
import {
  patchClueMessageCreatedQueryCache,
  patchClueMessageDeletedQueryCache,
  patchClueMessageUpdatedQueryCache,
} from "./clue-folder";

function message(messageId: number, overrides: Partial<ChatMessageResponse["message"]> = {}): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

describe("clue-folder query cache helpers", () => {
  it("会把创建的线索消息补进房间消息缓存", () => {
    const queryClient = new QueryClient();
    const roomId = 21;
    queryClient.setQueryData(getAllRoomMessagesQueryKey(roomId), [message(1)]);

    patchClueMessageCreatedQueryCache(queryClient, roomId, message(2).message);

    expect(queryClient.getQueryData<ChatMessageResponse[]>(getAllRoomMessagesQueryKey(roomId))?.map(item => item.message.messageId)).toEqual([1, 2]);
  });

  it("会把更新后的线索消息写回房间消息缓存", () => {
    const queryClient = new QueryClient();
    const roomId = 9;
    queryClient.setQueryData(getAllRoomMessagesQueryKey(roomId), [
      message(1),
      message(2, { content: "old" }),
    ]);

    patchClueMessageUpdatedQueryCache(queryClient, message(2, { content: "new" }).message);

    expect(queryClient.getQueryData<ChatMessageResponse[]>(getAllRoomMessagesQueryKey(roomId))?.map(item => item.message.content)).toEqual([
      "message-1",
      "new",
    ]);
  });

  it("会把删除后的线索消息标记为删除态", () => {
    const queryClient = new QueryClient();
    const roomId = 23;
    queryClient.setQueryData(getAllRoomMessagesQueryKey(roomId), [
      message(1),
      message(2),
    ]);

    patchClueMessageDeletedQueryCache(queryClient, roomId, 2);

    expect(queryClient.getQueryData<ChatMessageResponse[]>(getAllRoomMessagesQueryKey(roomId))?.map(item => [item.message.messageId, item.message.status])).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });
});
