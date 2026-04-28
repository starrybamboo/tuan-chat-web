import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { mergeAnnotationCatalog } from "@/components/chat/message/annotations/annotationCatalog";

import { tuanchat } from "../../../../api/instance";

import type { GalAuthoringContext, GalReference } from "./authoringTypes";
import type { GalPatchProposalStore } from "./localProposalStore";

import { buildGalAnnotations, buildGalAuthoringContext } from "./authoringProjection";
import { createGalPatchProposalSummary } from "./localProposalStore";

type GalAuthoringClient = Pick<TuanChat, "avatarController" | "chatController" | "roomController" | "roomRoleController" | "spaceController">;

export type GetGalAuthoringContextParams = {
  spaceId: number;
  roomId: number;
  attachmentRefs?: GalReference[];
  includeFlow?: boolean;
  client?: GalAuthoringClient;
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

function requireData<T>(value: unknown, label: string): T {
  const data = extractData<T>(value);
  if (!data) {
    throw new Error(`${label} 读取失败`);
  }
  return data;
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

async function getRoleAvatarMap(client: GalAuthoringClient, roles: UserRole[]) {
  const entries = await Promise.all(
    roles
      .filter(role => role.roleId > 0)
      .map(async (role): Promise<[number, RoleAvatar[]]> => {
        const response = await client.avatarController.getRoleAvatars(role.roleId);
        return [role.roleId, extractArrayPayload<RoleAvatar>(response)];
      }),
  );
  return new Map(entries);
}

export async function getGalAuthoringContext(params: GetGalAuthoringContextParams): Promise<GalAuthoringContext> {
  const client = params.client ?? tuanchat;
  const [
    spaceResponse,
    roomResponse,
    roomsResponse,
    messagesResponse,
    roomRolesResponse,
    roomNpcRolesResponse,
    activeProposal,
  ] = await Promise.all([
    client.spaceController.getSpaceInfo(params.spaceId),
    client.roomController.getRoomInfo(params.roomId),
    client.roomController.getUserRooms(params.spaceId),
    client.chatController.getAllMessage(params.roomId),
    client.roomRoleController.roomRole(params.roomId),
    client.roomRoleController.roomNpcRole(params.roomId),
    params.proposalStore?.getActive(String(params.roomId)) ?? Promise.resolve(null),
  ]);

  const space = requireData<Space>(spaceResponse, "空间");
  const room = requireData<Room>(roomResponse, "房间");
  const rooms = extractData<{ rooms?: Room[] }>(roomsResponse)?.rooms ?? [];
  const messages = extractArrayPayload<ChatMessageResponse>(messagesResponse)
    .map(response => response.message)
    .filter((message): message is Message => Boolean(message));
  const roomRoles = mergeRoles(
    extractArrayPayload<UserRole>(roomRolesResponse),
    extractArrayPayload<UserRole>(roomNpcRolesResponse),
  );
  const roleAvatarsByRoleId = await getRoleAvatarMap(client, roomRoles);
  const annotations = buildGalAnnotations(mergeAnnotationCatalog());

  return buildGalAuthoringContext({
    space,
    room,
    rooms,
    messages,
    roomRoles,
    roleAvatarsByRoleId,
    annotations,
    attachmentRefs: params.attachmentRefs,
    includeFlow: params.includeFlow,
    ...(activeProposal ? { activeProposal: createGalPatchProposalSummary(activeProposal) } : {}),
  });
}
