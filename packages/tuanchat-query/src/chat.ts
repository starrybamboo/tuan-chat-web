import { useMutation } from "@tanstack/react-query";

import type { ApiResultListMessage } from "@tuanchat/openapi-client/models/ApiResultListMessage";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";
import type { RoomMessageStreamPatchRequest } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { assertOpenApiResultSuccess } from "@tuanchat/domain/open-api-result";

export * from "./room-message";

type ChatClient = Pick<TuanChat, "chatController">;
export type PatchMessagesRequest = Omit<RoomMessageStreamPatchRequest, "roomId">;
export type PatchMessagesOptions = Pick<RoomMessageStreamPatchRequest, "mutationMeta">;

export function getAllRoomMessagesQueryKey(roomId: number) {
  return ["getHistoryMessages", roomId, 0] as const;
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

export async function patchInsertMessages(
  client: ChatClient,
  requests: ChatMessageRequest[],
  options: PatchMessagesOptions = {},
): Promise<ApiResultListMessage> {
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
    const result = await client.chatController.patchRoomMessages({
      roomId,
      operations: roomRequests.map(toRoomMessageInsertOperation),
      ...(options.mutationMeta ? { mutationMeta: options.mutationMeta } : {}),
    });
    assertOpenApiResultSuccess(result, "批量发送消息失败");
    createdMessages.push(...(result.data ?? []));
  }

  return { success: true, data: createdMessages };
}

export function usePatchMessagesMutation(client: ChatClient, roomId: number) {
  return useMutation({
    mutationFn: (req: PatchMessagesRequest) => client.chatController.patchRoomMessages({
      ...req,
      roomId,
    }),
    mutationKey: ["patchMessages", roomId],
  });
}
