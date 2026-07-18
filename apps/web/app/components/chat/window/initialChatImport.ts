import { patchInsertMessages } from "@tuanchat/query";

import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";

import { buildImportedChatMessageRequests } from "@/components/chat/utils/importChatMessageRequestBuilder";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";

import type { ChatMessageRequest, RoleAvatar, UserRole } from "../../../../api";

import { tuanchat } from "../../../../api/instance";

export type InitialImportChatMessage = ImportChatRequestMessage;

export function buildInitialImportChatRequests(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
  dicerAvatars: RoleAvatar[] = [],
): ChatMessageRequest[] {
  const avatarIdByRoleId = new Map(
    availableRoles
      .filter(role => typeof role.roleId === "number")
      .map(role => [role.roleId, role.avatarId ?? -1]),
  );

  return buildImportedChatMessageRequests(messages, {
    roomId,
    dicerRoleId: 2,
    dicerAvatars,
    resolveAvatarId: roleId => avatarIdByRoleId.get(roleId) ?? -1,
  });
}

const INITIAL_IMPORT_DICER_ROLE_ID = 2;

export function buildInitialImportRoomRoleAddRequests(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
) {
  const availableRoleTypeById = new Map(
    availableRoles
      .filter(role => typeof role.roleId === "number")
      .map(role => [role.roleId, role.type ?? 0]),
  );
  const typeByRoleId = new Map<number, number>();

  for (const message of messages) {
    if (message.roleId > 0) {
      typeByRoleId.set(message.roleId, availableRoleTypeById.get(message.roleId) ?? 0);
    }
  }

  if (messages.some(message => message.roleId === IMPORT_SPECIAL_ROLE_ID.DICER || message.diceTurn)) {
    // roleId=2 是导入流程沿用的系统骰娘；若它已被普通导入角色占用，则保留普通角色类型。
    if (!typeByRoleId.has(INITIAL_IMPORT_DICER_ROLE_ID)) {
      typeByRoleId.set(INITIAL_IMPORT_DICER_ROLE_ID, 1);
    }
  }

  const roleIdsByType = new Map<number, number[]>();
  for (const [roleId, type] of typeByRoleId) {
    const roleIds = roleIdsByType.get(type) ?? [];
    roleIds.push(roleId);
    roleIdsByType.set(type, roleIds);
  }

  return Array.from(roleIdsByType, ([type, roleIdList]) => ({
    roomId,
    roleIdList,
    type,
  }));
}

export function buildInitialImportRoomMemberAddRequest(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
) {
  const importedRoleIds = new Set(
    messages
      .map(message => message.roleId)
      .filter(roleId => roleId > 0),
  );
  const userIdList = Array.from(new Set(
    availableRoles
      .filter(role => importedRoleIds.has(role.roleId) && (role.type ?? 0) === 0 && role.userId > 0)
      .map(role => role.userId),
  ));

  return userIdList.length > 0
    ? { roomId, userIdList }
    : null;
}

async function ensureInitialImportRoomMembers(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
) {
  const request = buildInitialImportRoomMemberAddRequest(roomId, messages, availableRoles);
  if (!request) {
    return;
  }
  await tuanchat.roomMemberController.addMember1(request);
}

async function ensureInitialImportRoomRoles(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
) {
  const requests = buildInitialImportRoomRoleAddRequests(roomId, messages, availableRoles);
  for (const request of requests) {
    await tuanchat.roomRoleController.addRole(request);
  }
}

function hasDicerImportMessages(messages: InitialImportChatMessage[]) {
  return messages.some(message => message.roleId < 0 || message.diceTurn);
}

async function fetchInitialDicerAvatars(messages: InitialImportChatMessage[]) {
  if (!hasDicerImportMessages(messages)) {
    return [];
  }
  try {
    return (await tuanchat.avatarController.getRoleAvatars(2)).data ?? [];
  }
  catch {
    return [];
  }
}

export async function sendInitialImportChatMessages(
  roomId: number,
  messages: InitialImportChatMessage[],
  availableRoles: UserRole[],
  onProgress?: (sent: number, total: number) => void,
) {
  if (!messages.length) {
    return;
  }
  onProgress?.(0, messages.length);
  const dicerAvatars = await fetchInitialDicerAvatars(messages);
  const requests = buildInitialImportChatRequests(roomId, messages, availableRoles, dicerAvatars);
  await ensureInitialImportRoomMembers(roomId, messages, availableRoles);
  await ensureInitialImportRoomRoles(roomId, messages, availableRoles);
  const result = await patchInsertMessages(tuanchat, requests, {
    mutationMeta: {
      operationCause: "normal",
      sourceSurface: "import",
    },
  });
  if (!result.success) {
    throw new Error(result.errMsg || "导入初始对话失败");
  }
  onProgress?.(requests.length, requests.length);
}
