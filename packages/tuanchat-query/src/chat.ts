import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

import type { ApiResultListMessage } from "@tuanchat/openapi-client/models/ApiResultListMessage";
import type { ChatMessagePageRequest } from "@tuanchat/openapi-client/models/ChatMessagePageRequest";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";
import type { RoomMessageStreamPatchRequest } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchRequest";
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

export function toRoomMessageInsertOperation(request: ChatMessageRequest): RoomMessageStreamPatchOperation {
  return {
    op: "insert",
    message: {
      messageType: request.messageType,
      content: request.content ?? "",
      ...(Array.isArray(request.annotations) ? { annotations: request.annotations } : {}),
      extra: request.extra,
      ...(request.webgal !== undefined ? { webgal: request.webgal } : {}),
      ...(typeof request.roleId === "number" ? { roleId: request.roleId } : {}),
      ...(typeof request.avatarId === "number" ? { avatarId: request.avatarId } : {}),
      ...(typeof request.customRoleName === "string" ? { customRoleName: request.customRoleName } : {}),
      ...(typeof request.replayMessageId === "number" ? { replayMessageId: request.replayMessageId } : {}),
      ...(typeof request.position === "number" ? { position: request.position } : {}),
    },
  };
}

export async function patchInsertMessages(client: ChatClient, requests: ChatMessageRequest[]): Promise<ApiResultListMessage> {
  if (requests.length === 0) {
    return { success: true, data: [] };
  }

  const requestsByRoomId = new Map<number, ChatMessageRequest[]>();
  for (const request of requests) {
    const roomRequests = requestsByRoomId.get(request.roomId) ?? [];
    roomRequests.push(request);
    requestsByRoomId.set(request.roomId, roomRequests);
  }

  const createdMessages: NonNullable<ApiResultListMessage["data"]> = [];
  for (const [roomId, roomRequests] of requestsByRoomId) {
    const result = await client.chatController.patchRoomMessages(roomId, {
      operations: roomRequests.map(toRoomMessageInsertOperation),
    });
    if (!result.success) {
      return result;
    }
    createdMessages.push(...(result.data ?? []));
  }

  return { success: true, data: createdMessages };
}

export function usePatchMessagesMutation(client: ChatClient, roomId: number) {
  return useMutation({
    mutationFn: (req: RoomMessageStreamPatchRequest) => client.chatController.patchRoomMessages(roomId, req),
    mutationKey: ["patchMessages", roomId],
  });
}
