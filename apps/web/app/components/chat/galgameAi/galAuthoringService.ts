import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { getUserRoomsQueryKey } from "@tuanchat/query/spaces";

import { mergeAnnotationCatalog } from "@/components/chat/message/annotations/annotationCatalog";

import type { GalAuthoringContext, GalMessageView, GalReference, GalReferenceRoomContext } from "./authoringTypes";
import type { GalPatchProposalStore } from "./localProposalStore";

import {
  fetchRoomInfoWithCache,
  fetchRoomNpcRoleWithCache,
  fetchRoomRoleWithCache,
  fetchSpaceInfoWithCache,
  fetchUserRoomsWithCache,
  roomInfoQueryKey,
  roomNpcRoleQueryKey,
  roomRoleQueryKey,
  spaceInfoQueryKey,
} from "../../../../api/hooks/chatQueryHooks";
import { fetchRoleAvatarsWithCache, roleAvatarsQueryKey } from "../../../../api/hooks/RoleAndAvatarHooks";
import { tuanchat } from "../../../../api/instance";
import { buildGalAnnotations, buildGalAuthoringContext, GAL_NARRATOR, projectGalMessages, projectGalRoomContext, projectGalRoomRoles } from "./authoringProjection";
import { createGalPatchProposalSummary } from "./localProposalStore";

type GalAuthoringClient = Pick<TuanChat, "avatarController" | "chatController" | "roomController" | "roomRoleController" | "spaceController">;
const REFERENCE_ROOM_MESSAGE_LIMIT = 120;

export type GalAuthoringLocalSnapshot = {
  space?: Space | null;
  room?: Room | null;
  rooms?: Room[] | null;
  messages?: Message[] | null;
  roomRoles?: UserRole[] | null;
  roleAvatarsByRoleId?: Map<number, RoleAvatar[]> | null;
};

export type GetGalAuthoringContextParams = {
  spaceId: number;
  roomId: number;
  attachmentRefs?: GalReference[];
  referenceRoomIds?: number[];
  includeFlow?: boolean;
  client?: GalAuthoringClient;
  queryClient?: QueryClient;
  localSnapshot?: GalAuthoringLocalSnapshot;
  proposalStore?: GalPatchProposalStore;
};

function extractData<T>(value: unknown): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return (value as { data?: T }).data;
}

function extractArrayPayload<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  const data = extractData<unknown>(value);
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === "object") {
    const list = (data as { list?: unknown }).list;
    if (Array.isArray(list)) {
      return list as T[];
    }
  }
  return [];
}

function extractRoomsPayload(value: unknown): Room[] {
  const rooms = extractData<{ rooms?: Room[] }>(value)?.rooms;
  if (Array.isArray(rooms)) {
    return rooms;
  }
  return extractArrayPayload<Room>(value);
}

function extractMessagePayload(value: unknown): Message[] {
  return extractArrayPayload<ChatMessageResponse>(value)
    .map(response => response.message)
    .filter((message): message is Message => Boolean(message));
}

function requireData<T>(value: unknown, label: string): T {
  const data = extractData<T>(value);
  if (!data) {
    throw new Error(`${label} 读取失败`);
  }
  return data;
}

function getCachedQueryData(queryClient: QueryClient | undefined, queryKey: QueryKey): unknown {
  if (!queryClient?.getQueryState(queryKey)) {
    return undefined;
  }
  return queryClient.getQueryData(queryKey);
}

function getCachedData<T>(queryClient: QueryClient | undefined, queryKey: QueryKey): T | undefined {
  return extractData<T>(getCachedQueryData(queryClient, queryKey));
}

function getCachedArrayPayload<T>(queryClient: QueryClient | undefined, queryKey: QueryKey): T[] | undefined {
  const cached = getCachedQueryData(queryClient, queryKey);
  return cached === undefined ? undefined : extractArrayPayload<T>(cached);
}

function getCachedRooms(queryClient: QueryClient | undefined, spaceId: number): Room[] | undefined {
  const cached = getCachedQueryData(queryClient, getUserRoomsQueryKey(spaceId));
  return cached === undefined ? undefined : extractRoomsPayload(cached);
}

async function resolveSpace(params: GetGalAuthoringContextParams, client: GalAuthoringClient): Promise<Space> {
  if (params.localSnapshot?.space) {
    return params.localSnapshot.space;
  }

  const cached = getCachedData<Space>(params.queryClient, spaceInfoQueryKey(params.spaceId));
  if (cached) {
    return cached;
  }

  const response = params.queryClient && !params.client
    ? await fetchSpaceInfoWithCache(params.queryClient, params.spaceId)
    : await client.spaceController.getSpaceInfo(params.spaceId);
  return requireData<Space>(response, "空间");
}

async function resolveRoom(params: GetGalAuthoringContextParams, client: GalAuthoringClient): Promise<Room> {
  if (params.localSnapshot?.room) {
    return params.localSnapshot.room;
  }

  const cached = getCachedData<Room>(params.queryClient, roomInfoQueryKey(params.roomId));
  if (cached) {
    return cached;
  }

  const response = params.queryClient && !params.client
    ? await fetchRoomInfoWithCache(params.queryClient, params.roomId)
    : await client.roomController.getRoomInfo(params.roomId);
  return requireData<Room>(response, "房间");
}

async function resolveRooms(params: GetGalAuthoringContextParams, client: GalAuthoringClient): Promise<Room[]> {
  if (params.localSnapshot?.rooms) {
    return params.localSnapshot.rooms;
  }

  const cached = getCachedRooms(params.queryClient, params.spaceId);
  if (cached) {
    return cached;
  }

  const response = params.queryClient && !params.client
    ? await fetchUserRoomsWithCache(params.queryClient, params.spaceId)
    : await client.roomController.getUserRooms(params.spaceId);
  return extractRoomsPayload(response);
}

async function resolveMessages(params: GetGalAuthoringContextParams, client: GalAuthoringClient): Promise<Message[]> {
  if (params.localSnapshot?.messages) {
    return params.localSnapshot.messages;
  }

  const cached = getCachedQueryData(params.queryClient, ["getHistoryMessages", params.roomId, 0]);
  if (cached !== undefined) {
    return extractMessagePayload(cached);
  }

  const response = await client.chatController.getHistoryMessages({
    roomId: params.roomId,
    syncId: 0,
  });
  return extractMessagePayload(response);
}

async function resolveRoomRoles(params: GetGalAuthoringContextParams, client: GalAuthoringClient): Promise<UserRole[]> {
  if (params.localSnapshot?.roomRoles) {
    return params.localSnapshot.roomRoles;
  }

  const cachedRoomRoles = getCachedArrayPayload<UserRole>(params.queryClient, roomRoleQueryKey(params.roomId));
  const cachedNpcRoles = getCachedArrayPayload<UserRole>(params.queryClient, roomNpcRoleQueryKey(params.roomId));

  const [roomRolesResponse, roomNpcRolesResponse] = await Promise.all([
    cachedRoomRoles
      ? Promise.resolve(cachedRoomRoles)
      : (params.queryClient && !params.client
          ? fetchRoomRoleWithCache(params.queryClient, params.roomId)
          : client.roomRoleController.roomRole(params.roomId)),
    cachedNpcRoles
      ? Promise.resolve(cachedNpcRoles)
      : (params.queryClient && !params.client
          ? fetchRoomNpcRoleWithCache(params.queryClient, params.roomId)
          : client.roomRoleController.roomNpcRole(params.roomId)),
  ]);
  return mergeRoles(
    extractArrayPayload<UserRole>(roomRolesResponse),
    extractArrayPayload<UserRole>(roomNpcRolesResponse),
  );
}

function mergeRoles(...roleLists: UserRole[][]) {
  const roleById = new Map<number, UserRole>();
  for (const role of roleLists.flat()) {
    if (role?.roleId && !roleById.has(role.roleId)) {
      roleById.set(role.roleId, role);
    }
  }
  return Array.from(roleById.values());
}

async function getRoleAvatarMap(params: GetGalAuthoringContextParams, client: GalAuthoringClient, roles: UserRole[]) {
  const roleAvatarsByRoleId = new Map(params.localSnapshot?.roleAvatarsByRoleId ?? []);
  for (const role of roles) {
    if (role.roleId <= 0 || roleAvatarsByRoleId.has(role.roleId)) {
      continue;
    }

    const cached = getCachedArrayPayload<RoleAvatar>(params.queryClient, roleAvatarsQueryKey(role.roleId));
    if (cached) {
      roleAvatarsByRoleId.set(role.roleId, cached);
    }
  }

  const entries = await Promise.all(
    roles
      .filter(role => role.roleId > 0 && !roleAvatarsByRoleId.has(role.roleId))
      .map(async (role): Promise<[number, RoleAvatar[]]> => {
        const response = params.queryClient && !params.client
          ? await fetchRoleAvatarsWithCache(params.queryClient, role.roleId)
          : await client.avatarController.getRoleAvatars(role.roleId);
        return [role.roleId, extractArrayPayload<RoleAvatar>(response)];
      }),
  );
  for (const [roleId, avatars] of entries) {
    roleAvatarsByRoleId.set(roleId, avatars);
  }
  return roleAvatarsByRoleId;
}

function uniqueReferenceRoomIds(params: GetGalAuthoringContextParams): number[] {
  const currentRoomId = String(params.roomId);
  const seen = new Set<string>();
  const result: number[] = [];
  for (const roomId of params.referenceRoomIds ?? []) {
    if (!Number.isFinite(roomId) || roomId <= 0 || String(roomId) === currentRoomId || seen.has(String(roomId))) {
      continue;
    }
    seen.add(String(roomId));
    result.push(Math.floor(roomId));
  }
  return result.slice(0, 3);
}

function createReferenceRoomParams(
  params: GetGalAuthoringContextParams,
  roomId: number,
): GetGalAuthoringContextParams {
  return {
    ...params,
    roomId,
    referenceRoomIds: [],
    localSnapshot: {
      ...(params.localSnapshot?.space ? { space: params.localSnapshot.space } : {}),
      ...(params.localSnapshot?.rooms ? { rooms: params.localSnapshot.rooms } : {}),
    },
  };
}

function isReferenceKeyNode(message: GalMessageView): boolean {
  return message.purpose === "choice"
    || message.purpose === "control"
    || message.purpose === "background"
    || message.purpose === "bgm"
    || message.purpose === "se"
    || message.purpose === "cg";
}

function truncateReferenceRoomMessages(messages: GalMessageView[]): {
  messages: GalMessageView[];
  truncation?: GalReferenceRoomContext["truncation"];
} {
  if (messages.length <= REFERENCE_ROOM_MESSAGE_LIMIT) {
    return { messages };
  }

  const selectedIds = new Set<string>();
  for (const message of messages.slice(0, 20)) {
    selectedIds.add(message.messageId);
  }
  for (const message of messages.slice(-80)) {
    selectedIds.add(message.messageId);
  }
  for (const message of messages) {
    if (isReferenceKeyNode(message)) {
      selectedIds.add(message.messageId);
    }
  }

  const selectedMessages = messages
    .filter(message => selectedIds.has(message.messageId))
    .slice(-REFERENCE_ROOM_MESSAGE_LIMIT);

  return {
    messages: selectedMessages,
    truncation: {
      originalMessageCount: messages.length,
      includedMessageCount: selectedMessages.length,
      strategy: "head_tail_key_nodes",
    },
  };
}

async function resolveReferenceRoomContext(
  params: GetGalAuthoringContextParams,
  client: GalAuthoringClient,
  roomId: number,
): Promise<GalReferenceRoomContext | null> {
  try {
    const referenceParams = createReferenceRoomParams(params, roomId);
    const [room, messages, roomRoles] = await Promise.all([
      resolveRoom(referenceParams, client),
      resolveMessages(referenceParams, client),
      resolveRoomRoles(referenceParams, client),
    ]);
    if (String(room.spaceId) !== String(params.spaceId)) {
      return null;
    }
    const roleAvatarsByRoleId = await getRoleAvatarMap(referenceParams, client, roomRoles);
    const projectedMessages = projectGalMessages(messages, roomRoles);
    const truncated = truncateReferenceRoomMessages(projectedMessages);
    return {
      refId: `room:${room.roomId}`,
      room: projectGalRoomContext(room),
      messages: truncated.messages,
      roles: {
        roomRoles: projectGalRoomRoles(roomRoles, roleAvatarsByRoleId),
        narrator: GAL_NARRATOR,
      },
      ...(truncated.truncation ? { truncation: truncated.truncation } : {}),
    };
  }
  catch (error) {
    console.warn("[galAuthoringService] reference room resolve failed", { roomId, error });
    return null;
  }
}

export async function getGalAuthoringContext(params: GetGalAuthoringContextParams): Promise<GalAuthoringContext> {
  const client = params.client ?? tuanchat;
  const [
    space,
    room,
    rooms,
    messages,
    roomRoles,
    activeProposal,
  ] = await Promise.all([
    resolveSpace(params, client),
    resolveRoom(params, client),
    resolveRooms(params, client),
    resolveMessages(params, client),
    resolveRoomRoles(params, client),
    params.proposalStore?.getActive(String(params.roomId)) ?? Promise.resolve(null),
  ]);

  const roleAvatarsByRoleId = await getRoleAvatarMap(params, client, roomRoles);
  const annotations = buildGalAnnotations(mergeAnnotationCatalog());
  const referenceRooms = (
    await Promise.all(uniqueReferenceRoomIds(params).map(referenceRoomId => resolveReferenceRoomContext(params, client, referenceRoomId)))
  ).filter((room): room is GalReferenceRoomContext => room !== null);

  return buildGalAuthoringContext({
    space,
    room,
    rooms,
    messages,
    roomRoles,
    roleAvatarsByRoleId,
    annotations,
    attachmentRefs: params.attachmentRefs,
    referenceRooms,
    includeFlow: params.includeFlow,
    ...(activeProposal ? { activeProposal: createGalPatchProposalSummary(activeProposal) } : {}),
  });
}
