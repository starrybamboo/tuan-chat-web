import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

import type { ChatMessagePageRequest } from "@tuanchat/openapi-client/models/ChatMessagePageRequest";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

export * from "./room-message";

export type RoomMessagesQueryOptions = {
  enabled?: boolean;
  pageSize?: number;
  staleTime?: number;
};

type ChatClient = Pick<TuanChat, "chatController">;

export function getRoomMessagesQueryKey(roomId: number, pageSize: number = 20) {
  return ["getRoomMessages", roomId, pageSize] as const;
}

export function getAllRoomMessagesQueryKey(roomId: number) {
  return ["getAllMessage", roomId] as const;
}

export function useRoomMessagesInfiniteQuery(
  client: ChatClient,
  roomId: number,
  options?: RoomMessagesQueryOptions,
) {
  const pageSize = options?.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: getRoomMessagesQueryKey(roomId, pageSize),
    queryFn: ({ pageParam }) => client.chatController.getMsgPage(pageParam),
    initialPageParam: {
      roomId,
      pageSize,
    } satisfies ChatMessagePageRequest,
    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.isLast) {
        return undefined;
      }

      const cursor = lastPage.data.cursor;
      if (typeof cursor !== "number") {
        return undefined;
      }

      return {
        roomId,
        pageSize,
        cursor,
      } satisfies ChatMessagePageRequest;
    },
    staleTime: options?.staleTime ?? 30_000,
    enabled: (options?.enabled ?? true) && roomId > 0,
  });
}

export function useSendMessageMutation(client: ChatClient, roomId: number) {
  return useMutation({
    mutationFn: (req: ChatMessageRequest) => client.chatController.sendMessage1(req),
    mutationKey: ["sendMessage", roomId],
  });
}

export function useBatchSendMessageMutation(client: ChatClient, roomId: number) {
  return useMutation({
    mutationFn: (req: ChatMessageRequest[]) => client.chatController.batchSendMessages(req),
    mutationKey: ["batchSendMessage", roomId],
  });
}
