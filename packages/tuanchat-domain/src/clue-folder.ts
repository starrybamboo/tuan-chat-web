import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";

import { MESSAGE_TYPE } from "./messageType";

export type ClueFolderScope = "private" | "public";

export type ClueFolderMeta = {
  v: 1;
  scope: ClueFolderScope;
  ownerUserId?: number;
  createdAt?: string;
};

export const CLUE_FOLDER_EXTRA_KEY = "tuanChatClueFolder";
export const PRIVATE_CLUE_FOLDER_NAME = "我的线索";
export const PUBLIC_CLUE_FOLDER_NAME = "公共线索";

const READ_LINE_MESSAGE_TYPE = 10000;
const THREAD_ROOT_MESSAGE_TYPE = 10001;
const ACTIVE_GAME_MEMBER_TYPES = new Set([1, 2, 5]);

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  }
  catch {
    return null;
  }
}

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function cloneJsonValue<T>(value: T): T {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function getClueCardSnapshotMessage(source: Message): Pick<Message, "annotations" | "content" | "extra" | "messageType" | "webgal"> | null {
  if (source.messageType !== MESSAGE_TYPE.CLUE_CARD) {
    return null;
  }
  const extra = parseRecord(source.extra);
  const clueMessage = parseRecord(extra?.clueMessage);
  const snapshot = parseRecord(clueMessage?.snapshot);
  const messageType = toPositiveNumber(snapshot?.messageType);
  if (!messageType) {
    return null;
  }

  return {
    messageType,
    content: typeof snapshot?.content === "string" ? snapshot.content : "",
    ...(Array.isArray(snapshot?.annotations) ? { annotations: cloneJsonValue(snapshot.annotations) as Message["annotations"] } : {}),
    ...(snapshot?.extra !== undefined ? { extra: cloneJsonValue(snapshot.extra) as Message["extra"] } : {}),
    ...(snapshot?.webgal !== undefined ? { webgal: cloneJsonValue(snapshot.webgal) as Message["webgal"] } : {}),
  };
}

export function buildClueFolderExtraValue(params: {
  createdAt?: string;
  ownerUserId?: number | null;
  scope: ClueFolderScope;
}): string {
  const meta: ClueFolderMeta = {
    v: 1,
    scope: params.scope,
    ...(params.scope === "private" && params.ownerUserId ? { ownerUserId: params.ownerUserId } : {}),
    ...(params.createdAt ? { createdAt: params.createdAt } : {}),
  };
  return JSON.stringify(meta);
}

type ClueFolderRoomLike = {
  extra?: unknown;
};

export function getClueFolderMeta(room: ClueFolderRoomLike | null | undefined): ClueFolderMeta | null {
  const extra = parseRecord(room?.extra);
  const rawMeta = extra?.[CLUE_FOLDER_EXTRA_KEY];
  const meta = parseRecord(rawMeta);
  if (!meta) {
    return null;
  }

  const scope = meta.scope === "private" || meta.scope === "public" ? meta.scope : null;
  if (!scope) {
    return null;
  }

  return {
    v: 1,
    scope,
    ...(toPositiveNumber(meta.ownerUserId) ? { ownerUserId: toPositiveNumber(meta.ownerUserId) } : {}),
    ...(typeof meta.createdAt === "string" && meta.createdAt.trim() ? { createdAt: meta.createdAt.trim() } : {}),
  };
}

export function isClueFolderRoom(room: ClueFolderRoomLike | null | undefined): boolean {
  return getClueFolderMeta(room) != null;
}

export function isVisibleClueFolderForUser(
  room: ClueFolderRoomLike | null | undefined,
  currentUserId?: number | null,
): boolean {
  const meta = getClueFolderMeta(room);
  if (!meta) {
    return false;
  }
  if (meta.scope === "public") {
    return true;
  }
  return Boolean(currentUserId && meta.ownerUserId === currentUserId);
}

export function getClueFolderRoomName(scope: ClueFolderScope): string {
  return scope === "private" ? PRIVATE_CLUE_FOLDER_NAME : PUBLIC_CLUE_FOLDER_NAME;
}

export function partitionClueFolderRooms<TRoom extends ClueFolderRoomLike>(
  rooms: readonly TRoom[],
  currentUserId?: number | null,
) {
  const mainRooms: TRoom[] = [];
  const clueRooms: TRoom[] = [];
  let privateClueRoom: TRoom | null = null;
  let publicClueRoom: TRoom | null = null;

  for (const room of rooms) {
    const meta = getClueFolderMeta(room);
    if (!meta) {
      mainRooms.push(room);
      continue;
    }

    if (!isVisibleClueFolderForUser(room, currentUserId)) {
      continue;
    }

    clueRooms.push(room);
    if (meta.scope === "private") {
      privateClueRoom = privateClueRoom ?? room;
    }
    else {
      publicClueRoom = publicClueRoom ?? room;
    }
  }

  return {
    clueRooms,
    mainRooms,
    privateClueRoom,
    publicClueRoom,
  };
}

export function getOrderedVisibleClueFolderRooms<TRoom extends ClueFolderRoomLike>(
  rooms: readonly TRoom[],
  currentUserId?: number | null,
): TRoom[] {
  const { privateClueRoom, publicClueRoom } = partitionClueFolderRooms(rooms, currentUserId);
  return [privateClueRoom, publicClueRoom].filter((room): room is TRoom => room != null);
}

export function getPublicClueFolderMemberIds(
  spaceMembers: readonly Pick<SpaceMember, "memberType" | "userId">[],
  fallbackUserId?: number | null,
): number[] {
  const ids = new Set<number>();
  for (const member of spaceMembers) {
    const userId = toPositiveNumber(member.userId);
    if (!userId || !ACTIVE_GAME_MEMBER_TYPES.has(Number(member.memberType))) {
      continue;
    }
    ids.add(userId);
  }
  const fallback = toPositiveNumber(fallbackUserId);
  if (fallback) {
    ids.add(fallback);
  }
  return [...ids];
}

export function canCopyMessageToClueFolder(
  message: Pick<Message, "messageType" | "status"> | null | undefined,
): boolean {
  if (!message || message.status === 1) {
    return false;
  }
  return message.messageType !== READ_LINE_MESSAGE_TYPE && message.messageType !== THREAD_ROOT_MESSAGE_TYPE;
}

export function buildClueMessageCopyRequest(params: {
  fallbackRoleId?: number | null;
  sourceMessage: Message;
  targetRoomId: number;
}): ChatMessageRequest {
  const source = params.sourceMessage;
  const copiedSource = getClueCardSnapshotMessage(source) ?? source;
  const fallbackRoleId = toPositiveNumber(params.fallbackRoleId);
  const sourceWasNarrator = !toPositiveNumber(source.roleId);

  return {
    roomId: params.targetRoomId,
    messageType: copiedSource.messageType,
    ...(fallbackRoleId ? { roleId: fallbackRoleId } : {}),
    content: copiedSource.content ?? "",
    ...(copiedSource.annotations?.length ? { annotations: [...copiedSource.annotations] } : {}),
    ...(source.customRoleName
      ? { customRoleName: source.customRoleName }
      : sourceWasNarrator
        ? { customRoleName: "旁白" }
        : {}),
    ...(copiedSource.webgal ? { webgal: cloneJsonValue(copiedSource.webgal) } : {}),
    extra: cloneJsonValue(copiedSource.extra ?? {}),
  };
}
