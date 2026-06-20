import type {
  ChatMessageResponse,
  Message,
  RoomMessageStreamItem,
  RoomMessageStreamPatchOperation,
} from "../../../../../api";

import { getNormalizedStateEventExtra } from "@/types/stateEvent";

import { MessageType } from "../../../../../api/wsModels";

type MapConfigMessagePatch = Pick<Message, "content" | "extra">;

function toRoomMessageStreamItem(message: Message): RoomMessageStreamItem {
  return {
    messageType: message.messageType,
    content: message.content ?? "",
    ...(Array.isArray(message.annotations) && message.annotations.length > 0 ? { annotations: message.annotations } : {}),
    ...(message.extra ? { extra: message.extra } : {}),
    ...(message.webgal !== undefined ? { webgal: message.webgal } : {}),
    ...(typeof message.roleId === "number" ? { roleId: message.roleId } : {}),
    ...(typeof message.avatarId === "number" ? { avatarId: message.avatarId } : {}),
    ...(typeof message.customRoleName === "string" ? { customRoleName: message.customRoleName } : {}),
    ...(typeof message.replyMessageId === "number" ? { replayMessageId: message.replyMessageId } : {}),
    ...(typeof message.position === "number" ? { position: message.position } : {}),
  };
}

function isSingleMapConfigUpsertMessage(message: Message): boolean {
  if (message.status === 1 || message.messageType !== MessageType.STATE_EVENT) {
    return false;
  }
  const normalized = getNormalizedStateEventExtra(message.extra);
  return normalized?.events.length === 1 && normalized.events[0]?.type === "mapConfigUpsert";
}

function isMapConfigClearMessage(message: Message): boolean {
  if (message.status === 1 || message.messageType !== MessageType.STATE_EVENT) {
    return false;
  }
  const normalized = getNormalizedStateEventExtra(message.extra);
  return normalized?.events.some(event => event.type === "mapConfigClear") === true;
}

export function findLatestUpdatableMapConfigMessage(
  messages: readonly ChatMessageResponse[] | undefined,
  roomId: number,
): ChatMessageResponse | null {
  if (!messages || !Number.isFinite(roomId) || roomId <= 0) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const response = messages[index];
    const message = response?.message;
    if (!message || message.roomId !== roomId) {
      continue;
    }

    // 清空地图是新的状态边界，之后的上传/调整不能回写到清空之前的配置消息。
    if (isMapConfigClearMessage(message)) {
      return null;
    }
    if (isSingleMapConfigUpsertMessage(message)) {
      return response;
    }
  }

  return null;
}

export function buildMapConfigMessageUpdateOperation(
  message: Message,
  patch: MapConfigMessagePatch,
): RoomMessageStreamPatchOperation {
  const nextMessage: Message = {
    ...message,
    content: patch.content,
    extra: patch.extra,
  };
  return {
    op: "update",
    messageId: message.messageId,
    message: toRoomMessageStreamItem(nextMessage),
  };
}

export function buildUpdatedMapConfigMessageResponse(
  response: ChatMessageResponse,
  patch: MapConfigMessagePatch,
): ChatMessageResponse {
  return {
    ...response,
    message: {
      ...response.message,
      content: patch.content,
      extra: patch.extra,
      updateTime: new Date().toISOString(),
    },
  };
}
