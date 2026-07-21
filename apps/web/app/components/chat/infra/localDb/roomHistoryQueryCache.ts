import type { QueryClient } from "@tanstack/react-query";
import type { RoomMessagesQueryData } from "@tuanchat/query/room-message-query-data";

import {
  extractRoomMessagesFromQueryData,
  getRoomMessagesQueryKey,
  updateRoomMessagesQueryData,
} from "@tuanchat/query/room-message-query-data";

import type { ChatMessageResponse } from "../../../../../api";

export type RoomHistoryRuntimeState = {
  messageIdAliases: Map<number, { toMessageId: number; updatedAt: number }>;
};

const runtimeByQueryClient = new WeakMap<QueryClient, Map<number, RoomHistoryRuntimeState>>();

/** 返回与 QueryClient 和房间绑定的非渲染同步元数据。 */
export function getRoomHistoryRuntime(queryClient: QueryClient, roomId: number): RoomHistoryRuntimeState {
  let runtimeByRoom = runtimeByQueryClient.get(queryClient);
  if (!runtimeByRoom) {
    runtimeByRoom = new Map();
    runtimeByQueryClient.set(queryClient, runtimeByRoom);
  }
  let runtime = runtimeByRoom.get(roomId);
  if (!runtime) {
    runtime = {
      messageIdAliases: new Map(),
    };
    runtimeByRoom.set(roomId, runtime);
  }
  return runtime;
}

/** 读取房间当前共享的 Query 工作消息。 */
export function getRoomMessagesFromQueryCache(queryClient: QueryClient, roomId: number) {
  return extractRoomMessagesFromQueryData(
    queryClient.getQueryData<RoomMessagesQueryData>(getRoomMessagesQueryKey(roomId)),
  );
}

/** 通过同步不可变 updater 更新房间 Query 工作消息。 */
export function updateRoomMessagesQueryCache(
  queryClient: QueryClient,
  roomId: number,
  updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
) {
  return queryClient.setQueryData<RoomMessagesQueryData>(
    getRoomMessagesQueryKey(roomId),
    currentData => updateRoomMessagesQueryData(currentData, updater),
  );
}

/** Query cache 清空时同步移除 dirty 和 messageId alias 等运行时元数据。 */
export function resetRoomHistoryQueryRuntime(queryClient: QueryClient) {
  runtimeByQueryClient.delete(queryClient);
}
