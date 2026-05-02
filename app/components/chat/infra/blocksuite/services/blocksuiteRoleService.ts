import type { QueryClient } from "@tanstack/react-query";

import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import {
  fetchRoomNpcRoleWithCache,
  fetchSpaceRepositoryRoleWithCache,
} from "api/hooks/chatQueryHooks";
import { tuanchat } from "api/instance";

import { parseSpaceDocId } from "../space/spaceDocId";

export type BlocksuiteMentionRoleEntry = UserRole & {
  roleId: number;
};

function isBlocksuiteMentionNpcRole(role: UserRole | null | undefined) {
  return role?.type === 2 || role?.npc === true;
}

function normalizeRoleList(roles: Array<UserRole | null | undefined>): BlocksuiteMentionRoleEntry[] {
  const deduped = new Map<number, BlocksuiteMentionRoleEntry>();

  roles.forEach((role) => {
    if (!isBlocksuiteMentionNpcRole(role)) {
      return;
    }

    const roleId = Number(role?.roleId);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return;
    }

    deduped.set(roleId, {
      ...(role ?? {}),
      roleId,
      userId: Number(role?.userId) || 0,
      type: typeof role?.type === "number" ? role.type : 0,
    });
  });

  return Array.from(deduped.values());
}

async function listBlocksuiteRoomMentionRoles(roomId: number, queryClient?: QueryClient): Promise<BlocksuiteMentionRoleEntry[]> {
  if (!Number.isFinite(roomId) || roomId <= 0) {
    return [];
  }

  try {
    const roomNpcRoleResult = queryClient
      ? await fetchRoomNpcRoleWithCache(queryClient, roomId)
      : await tuanchat.roomRoleController.roomNpcRole(roomId);
    return normalizeRoleList(roomNpcRoleResult.data ?? []);
  }
  catch {
    return [];
  }
}

async function listBlocksuiteSpaceMentionRoles(spaceId: number, queryClient?: QueryClient): Promise<BlocksuiteMentionRoleEntry[]> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return [];
  }

  const response = queryClient
    ? await fetchSpaceRepositoryRoleWithCache(queryClient, spaceId)
    : await tuanchat.spaceRepositoryController.spaceRole(spaceId);
  return normalizeRoleList(response.data ?? []);
}

export async function listBlocksuiteMentionRoles(params: {
  spaceId?: number;
  currentDocId?: string;
  queryClient?: QueryClient;
}): Promise<BlocksuiteMentionRoleEntry[]> {
  const { spaceId, currentDocId, queryClient } = params;
  const docDescriptor = currentDocId ? parseSpaceDocId(currentDocId) : null;

  if (docDescriptor?.kind === "room_description") {
    const roomRoles = await listBlocksuiteRoomMentionRoles(docDescriptor.roomId, queryClient);
    if (roomRoles.length > 0) {
      return roomRoles;
    }
  }

  try {
    return await listBlocksuiteSpaceMentionRoles(Number(spaceId), queryClient);
  }
  catch {
    return [];
  }
}
