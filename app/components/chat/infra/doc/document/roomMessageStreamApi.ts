import type { MessageEditorMessage } from "@/components/messageEditor/messageEditorTypes";

import { compareMessagesByOrder } from "@/components/chat/shared/messageOrder";
import { normalizeMessageEditorDraft } from "@/components/messageEditor/model/messageEditorTransforms";
import { tuanchat } from "api/instance";

import type {
  ChatMessageResponse,
  Message,
  RoomMessageStreamItem,
} from "../../../../../../api";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success: boolean;
};

export type RoomMessageStreamInput = {
} & MessageEditorMessage;

export type RoomMessageStreamPatchOperation = {
  clientId?: string;
  message?: RoomMessageStreamInput;
  messageId?: number;
  op: "insert" | "update" | "delete" | "move";
  position?: number;
};

function unwrapApiResult<T>(result: ApiResult<T>, fallbackMessage: string): T {
  if (!result?.success) {
    throw new Error(result?.errMsg || fallbackMessage);
  }
  return result.data as T;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toRoomMessageStreamItem(message: RoomMessageStreamInput): RoomMessageStreamItem | null {
  const normalized = normalizeMessageEditorDraft(message);
  if (!normalized) {
    return null;
  }
  return {
    messageType: normalized.messageType,
    content: normalized.content ?? "",
    ...(Array.isArray(normalized.annotations) && normalized.annotations.length > 0 ? { annotations: normalized.annotations } : {}),
    ...(normalized.extra ? { extra: normalized.extra } : {}),
    ...(normalized.webgal ? { webgal: normalized.webgal } : {}),
    ...(typeof normalized.roleId === "number" ? { roleId: normalized.roleId } : {}),
    ...(typeof normalized.avatarId === "number" ? { avatarId: normalized.avatarId } : {}),
    ...(cleanString(normalized.customRoleName) ? { customRoleName: cleanString(normalized.customRoleName) } : {}),
    ...(typeof normalized.replyMessageId === "number" ? { replayMessageId: normalized.replyMessageId } : {}),
    ...(typeof (normalized as RoomMessageStreamInput).position === "number" ? { position: (normalized as RoomMessageStreamInput).position } : {}),
  };
}

function isRuntimeMessage(value: unknown): value is Message {
  const message = value as Partial<Message> | null | undefined;
  return Boolean(message)
    && typeof message?.messageId === "number"
    && typeof message?.syncId === "number"
    && typeof message?.roomId === "number"
    && typeof message?.userId === "number"
    && typeof message?.status === "number"
    && typeof message?.messageType === "number"
    && typeof message?.position === "number";
}

type RoomMessageApiResponseItem = Message | ChatMessageResponse;

function extractRoomMessage(value: unknown): Message | null {
  if (isRuntimeMessage(value)) {
    return value;
  }

  const response = value as Partial<ChatMessageResponse> | null | undefined;
  if (response && isRuntimeMessage(response.message)) {
    return response.message;
  }

  return null;
}

function readRoomMessageStreamMessages(
  response: RoomMessageApiResponseItem[] | null | undefined,
): Message[] {
  const messages = Array.isArray(response) ? response : [];
  return messages
    .map(extractRoomMessage)
    .filter((message): message is Message => Boolean(message))
    .sort(compareMessagesByOrder);
}

export async function patchRemoteRoomMessageStream(params: {
  operations: RoomMessageStreamPatchOperation[];
  roomId: number;
}): Promise<Message[]> {
  const operations = params.operations
    .map((operation) => {
      const message = operation.message ? toRoomMessageStreamItem(operation.message) : undefined;
      return {
        op: operation.op,
        ...(operation.clientId ? { clientId: operation.clientId } : {}),
        ...(typeof operation.messageId === "number" ? { messageId: operation.messageId } : {}),
        ...(typeof operation.position === "number" ? { position: operation.position } : {}),
        ...(message ? { message } : {}),
      };
    })
    .filter((operation) => {
      return operation.op === "delete" || operation.op === "move" || Boolean(operation.message);
    });
  if (operations.length === 0) {
    return [];
  }
  const result = await tuanchat.chatController.patchRoomMessages({
    roomId: params.roomId,
    operations,
  });
  return readRoomMessageStreamMessages(unwrapApiResult(result, "批量变更房间消息列表失败"));
}
