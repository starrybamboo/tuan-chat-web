import type { InfiniteData } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

import type { ApiResultCursorPageBaseResponseChatMessageResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseChatMessageResponse";
import type { ChatMessagePageRequest } from "@tuanchat/openapi-client/models/ChatMessagePageRequest";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

export type RoomMessagesQueryOptions = {
  enabled?: boolean;
  pageSize?: number;
  staleTime?: number;
};

type ChatClient = Pick<TuanChat, "chatController">;

export type RoomMessagesInfiniteQueryData = InfiniteData<
  ApiResultCursorPageBaseResponseChatMessageResponse,
  ChatMessagePageRequest
>;

export function getRoomMessagesQueryKey(roomId: number, pageSize: number = 20) {
  return ["getRoomMessages", roomId, pageSize] as const;
}

function compareRoomMessages(left: ChatMessageResponse, right: ChatMessageResponse) {
  const leftOrder = typeof left.message.position === "number"
    ? left.message.position
    : left.message.syncId ?? left.message.messageId;
  const rightOrder = typeof right.message.position === "number"
    ? right.message.position
    : right.message.syncId ?? right.message.messageId;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.message.messageId - right.message.messageId;
}

export function mergeRoomMessages(
  ...messageLists: Array<ChatMessageResponse[] | undefined>
): ChatMessageResponse[] {
  const messageMap = new Map<number, ChatMessageResponse>();

  messageLists.forEach((messageList) => {
    messageList?.forEach((item) => {
      const messageId = item?.message?.messageId;
      if (typeof messageId === "number" && Number.isFinite(messageId)) {
        messageMap.set(messageId, item);
      }
    });
  });

  return Array.from(messageMap.values()).sort(compareRoomMessages);
}

export function flattenRoomMessagePages(
  pages: Array<{ data?: { list?: ChatMessageResponse[] } }> | undefined,
): ChatMessageResponse[] {
  if (!pages || pages.length === 0) {
    return [];
  }

  return mergeRoomMessages(...pages.map(page => page.data?.list));
}

export function upsertRoomMessagesInfiniteData(
  currentData: RoomMessagesInfiniteQueryData | undefined,
  roomId: number,
  incomingMessages: ChatMessageResponse[],
  pageSize: number = 20,
): RoomMessagesInfiniteQueryData {
  const nextIncomingMessages = mergeRoomMessages(incomingMessages);
  if (nextIncomingMessages.length === 0) {
    return currentData ?? {
      pageParams: [{
        roomId,
        pageSize,
      }],
      pages: [{
        success: true,
        data: {
          isLast: true,
          list: [],
        },
      }],
    };
  }

  if (!currentData || currentData.pages.length === 0) {
    return {
      pageParams: [{
        roomId,
        pageSize,
      }],
      pages: [{
        success: true,
        data: {
          isLast: true,
          list: nextIncomingMessages,
        },
      }],
    };
  }

  const [firstPage, ...restPages] = currentData.pages;
  const mergedFirstPageMessages = mergeRoomMessages(firstPage.data?.list, nextIncomingMessages);

  return {
    pageParams: currentData.pageParams.length > 0
      ? currentData.pageParams
      : [{
          roomId,
          pageSize,
        }],
    pages: [{
      ...firstPage,
      data: {
        ...firstPage.data,
        list: mergedFirstPageMessages,
      },
    }, ...restPages],
  };
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
