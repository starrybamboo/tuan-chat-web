import type { MessageUndoAction } from "@/components/chat/stores/roomUiStore";
import type { PatchMessagesRequest } from "@tuanchat/query/chat";

import type { Message, RoomMessageStreamItem, RoomMessageStreamPatchOperation } from "../../../../api";

type MessageHistoryOperationCause = "redo" | "undo";

export function toRoomMessagePatchItem(message: Message): RoomMessageStreamItem {
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

export function buildMessageHistoryPatchOperation(
  action: MessageUndoAction,
  operationCause: MessageHistoryOperationCause,
): RoomMessageStreamPatchOperation {
  if (action.type === "send") {
    if (operationCause === "undo") {
      return {
        op: "delete",
        messageId: action.after.messageId,
      };
    }
    return {
      op: "update",
      messageId: action.after.messageId,
      message: toRoomMessagePatchItem({
        ...action.after,
        status: 0,
      }),
    };
  }

  if (action.type === "delete") {
    if (operationCause === "undo") {
      return {
        op: "update",
        messageId: action.before.messageId,
        message: toRoomMessagePatchItem(action.before),
      };
    }
    return {
      op: "delete",
      messageId: action.before.messageId,
    };
  }

  return {
    op: "update",
    messageId: action.after.messageId,
    message: toRoomMessagePatchItem(operationCause === "undo" ? action.before : action.after),
  };
}

export function buildMessageHistoryPatchRequest(
  action: MessageUndoAction,
  operationCause: MessageHistoryOperationCause,
): PatchMessagesRequest {
  return {
    operations: [buildMessageHistoryPatchOperation(action, operationCause)],
    mutationMeta: {
      operationCause,
    },
  };
}

export function getMessageHistoryPatchFallbackMessage(
  action: MessageUndoAction,
  operationCause: MessageHistoryOperationCause,
  currentMessage?: Message,
): Message {
  if (action.type === "send") {
    return operationCause === "undo"
      ? {
          ...(currentMessage ?? action.after),
          status: 1,
        }
      : {
          ...action.after,
          status: 0,
        };
  }

  if (action.type === "delete") {
    return operationCause === "undo"
      ? action.before
      : {
          ...(currentMessage ?? action.before),
          status: 1,
        };
  }

  return operationCause === "undo" ? action.before : action.after;
}
