import { normalizeMessageEditorDraft } from "@/components/messageEditor/model/messageEditorTransforms";
import { tuanchat } from "api/instance";

import type {
  Message,
  RoomMessageStreamItem,
  RoomMessageStreamResponse,
} from "../../../../../../api";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success: boolean;
};

export type RoomMessageStreamInput = {
  annotations?: Message["annotations"];
  avatarId?: Message["avatarId"];
  content?: Message["content"];
  customRoleName?: Message["customRoleName"];
  extra?: Message["extra"];
  messageId?: Message["messageId"];
  messageType?: Message["messageType"];
  position?: Message["position"];
  roleId?: Message["roleId"];
  webgal?: Message["webgal"];
};

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

export function readRoomMessageStreamMessages(response: RoomMessageStreamResponse | null | undefined): Message[] {
  const messages = Array.isArray(response?.messages) ? response.messages : [];
  return messages.filter(isRuntimeMessage);
}

export async function getRemoteRoomMessageStream(params: {
  roomId: number;
}): Promise<RoomMessageStreamResponse> {
  const result = await tuanchat.request.request<ApiResult<RoomMessageStreamResponse>>({
    method: "GET",
    url: `/chat/message-stream/${encodeURIComponent(String(params.roomId))}`,
  });
  return unwrapApiResult(result, "获取房间消息流失败");
}

export async function syncRemoteRoomMessageStream(params: {
  baseRevision: number | null | undefined;
  force?: boolean;
  messages: RoomMessageStreamInput[];
  roomId: number;
}): Promise<RoomMessageStreamResponse> {
  const messages = params.messages
    .map(message => toRoomMessageStreamItem(message))
    .filter((message): message is RoomMessageStreamItem => message !== null);
  const result = await tuanchat.request.request<ApiResult<RoomMessageStreamResponse>>({
    method: "POST",
    url: `/chat/message-stream/${encodeURIComponent(String(params.roomId))}/sync`,
    body: {
      baseRevision: params.baseRevision ?? 0,
      force: params.force ?? false,
      messages,
    },
    mediaType: "application/json",
  });
  return unwrapApiResult(result, "同步房间消息流失败");
}

export async function patchRemoteRoomMessageStream(params: {
  operations: RoomMessageStreamPatchOperation[];
  roomId: number;
}): Promise<RoomMessageStreamResponse> {
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
    return { messages: [] };
  }
  const result = await tuanchat.request.request<ApiResult<RoomMessageStreamResponse>>({
    method: "POST",
    url: `/chat/message-stream/${encodeURIComponent(String(params.roomId))}/patch`,
    body: { operations },
    mediaType: "application/json",
  });
  return unwrapApiResult(result, "批量变更房间消息流失败");
}
