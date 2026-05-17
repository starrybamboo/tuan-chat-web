import type { MessageDraft } from "@/types/messageDraft";

import { normalizeMessageEditorDraft } from "@/components/messageEditor/model/messageEditorTransforms";
import { tuanchat } from "api/instance";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success: boolean;
};

export type DocRoomMessageItem = {
  annotations?: string[];
  avatarId?: number;
  content?: string;
  customRoleName?: string;
  extra?: MessageDraft["extra"];
  messageType?: number;
  roleId?: number;
  webgal?: MessageDraft["webgal"];
};

export type DocRoomSnapshotResponse = {
  conflict?: boolean;
  docId?: string;
  messages?: DocRoomMessageItem[];
  revision?: number;
  roomId?: number;
  spaceId?: number;
  updatedAt?: number;
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

function toDocRoomMessageItem(message: MessageDraft): DocRoomMessageItem | null {
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
  };
}

export function readDocRoomSnapshotMessages(response: DocRoomSnapshotResponse | null | undefined): MessageDraft[] {
  const messages = Array.isArray(response?.messages) ? response.messages : [];
  return messages
    .map(message => normalizeMessageEditorDraft(message))
    .filter((message): message is MessageDraft => message !== null);
}

export async function getRemoteDocRoomSnapshot(params: {
  roomId: number;
}): Promise<DocRoomSnapshotResponse> {
  const result = await tuanchat.request.request<ApiResult<DocRoomSnapshotResponse>>({
    method: "GET",
    url: `/doc-room/${encodeURIComponent(String(params.roomId))}/snapshot`,
  });
  return unwrapApiResult(result, "获取文档云端快照失败");
}

export async function syncRemoteDocRoomSnapshot(params: {
  baseRevision: number | null | undefined;
  force?: boolean;
  messages: MessageDraft[];
  roomId: number;
}): Promise<DocRoomSnapshotResponse> {
  const messages = params.messages
    .map(message => toDocRoomMessageItem(message))
    .filter((message): message is DocRoomMessageItem => message !== null);
  const result = await tuanchat.request.request<ApiResult<DocRoomSnapshotResponse>>({
    method: "POST",
    url: `/doc-room/${encodeURIComponent(String(params.roomId))}/sync`,
    body: {
      baseRevision: params.baseRevision ?? 0,
      force: params.force ?? false,
      messages,
    },
    mediaType: "application/json",
  });
  return unwrapApiResult(result, "同步文档云端快照失败");
}
