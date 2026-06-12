import type { ChatMessageResponse, RoleAvatar, Room, UserRole } from "../../api";
import type { RealtimeGameConfig } from "./realtimeRendererConfig";

export type SpaceWebgalCoverAvatarSource = {
  fileId?: number;
  mediaType?: string;
};

export type SpaceWebgalInputSnapshot = {
  spaceId?: number;
  spaceName?: string;
  workflowRoomMap?: Record<string, Array<string>>;
  renderableRooms: Room[];
  messagesByRoomId: Record<number, ChatMessageResponse[]>;
  roles: UserRole[];
  avatars: RoleAvatar[];
  hydratedGameConfig: Partial<RealtimeGameConfig>;
  rawGameConfig?: string;
  sharedEngineUrl?: string;
  coverAvatarSource?: SpaceWebgalCoverAvatarSource;
};

export type SpaceWebgalInput = {
  spaceId?: number;
  spaceName?: string;
  workflowRoomMap?: Record<string, Array<string>>;
  rooms: Room[];
  messagesByRoomId: Record<number, ChatMessageResponse[] | undefined>;
  roles?: UserRole[];
  avatars?: RoleAvatar[];
  gameConfig?: Partial<RealtimeGameConfig>;
  rawGameConfig?: string;
  sharedEngineUrl?: string;
  coverAvatarFileId?: number;
  coverAvatarMediaType?: string;
};

function normalizePositiveNumber(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.floor(raw);
}

function getMessageOrder(message: ChatMessageResponse): number {
  const payload = message.message;
  if (Number.isFinite(payload.position)) {
    return payload.position;
  }
  if (Number.isFinite(payload.syncId)) {
    return payload.syncId;
  }
  return payload.messageId ?? 0;
}

function sortMessages(messages: ChatMessageResponse[] | undefined): ChatMessageResponse[] {
  return [...(messages ?? [])].sort((left, right) => getMessageOrder(left) - getMessageOrder(right));
}

function normalizeRenderableRooms(rooms: Room[]): Room[] {
  return rooms
    .filter(room => Number.isFinite(room.roomId) && Number(room.roomId) > 0 && room.status !== 1)
    .map(room => ({ ...room }))
    .sort((left, right) => Number(left.roomId) - Number(right.roomId));
}

function normalizeRoles(roles: UserRole[] | undefined): UserRole[] {
  const roleMap = new Map<number, UserRole>();
  (roles ?? []).forEach((role) => {
    const roleId = Number(role.roleId ?? 0);
    if (!Number.isFinite(roleId) || roleId <= 0 || roleMap.has(roleId)) {
      return;
    }
    roleMap.set(roleId, { ...role, roleId });
  });
  return Array.from(roleMap.values());
}

function normalizeAvatars(avatars: RoleAvatar[] | undefined): RoleAvatar[] {
  const avatarMap = new Map<number, RoleAvatar>();
  (avatars ?? []).forEach((avatar) => {
    const avatarId = Number(avatar.avatarId ?? 0);
    if (!Number.isFinite(avatarId) || avatarId <= 0 || avatarMap.has(avatarId)) {
      return;
    }
    avatarMap.set(avatarId, { ...avatar, avatarId });
  });
  return Array.from(avatarMap.values());
}

function normalizeMessagesByRoomId(
  roomIds: number[],
  messagesByRoomId: Record<number, ChatMessageResponse[] | undefined>,
): Record<number, ChatMessageResponse[]> {
  const result: Record<number, ChatMessageResponse[]> = {};
  roomIds.forEach((roomId) => {
    result[roomId] = sortMessages(messagesByRoomId[roomId]).map(message => ({ ...message, message: { ...message.message } }));
  });
  return result;
}

function normalizeCoverAvatarSource(input: SpaceWebgalInput): SpaceWebgalCoverAvatarSource | undefined {
  const fileId = normalizePositiveNumber(input.coverAvatarFileId);
  const mediaType = String(input.coverAvatarMediaType ?? "").trim();
  if (fileId == null) {
    return undefined;
  }
  return {
    fileId,
    ...(mediaType ? { mediaType } : {}),
  };
}

export function buildSpaceWebgalInputSnapshot(input: SpaceWebgalInput): SpaceWebgalInputSnapshot {
  const renderableRooms = normalizeRenderableRooms(input.rooms);
  const roomIds = renderableRooms.map(room => Number(room.roomId));
  return {
    spaceId: input.spaceId,
    spaceName: input.spaceName,
    workflowRoomMap: input.workflowRoomMap,
    renderableRooms,
    messagesByRoomId: normalizeMessagesByRoomId(roomIds, input.messagesByRoomId),
    roles: normalizeRoles(input.roles),
    avatars: normalizeAvatars(input.avatars),
    hydratedGameConfig: { ...input.gameConfig },
    rawGameConfig: input.rawGameConfig,
    sharedEngineUrl: input.sharedEngineUrl,
    coverAvatarSource: normalizeCoverAvatarSource(input),
  };
}
