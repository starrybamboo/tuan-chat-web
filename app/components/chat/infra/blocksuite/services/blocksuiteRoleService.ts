import type { UserRole } from "api/models/UserRole";

import { tuanchat } from "api/instance";

import { parseSpaceDocId } from "../space/spaceDocId";

export type BlocksuiteMentionRoleEntry = UserRole & {
  roleId: number;
};

function normalizeRoleList(roles: Array<UserRole | null | undefined>): BlocksuiteMentionRoleEntry[] {
  const deduped = new Map<number, BlocksuiteMentionRoleEntry>();

  roles.forEach((role) => {
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

async function listBlocksuiteRoomMentionRoles(roomId: number): Promise<BlocksuiteMentionRoleEntry[]> {
  if (!Number.isFinite(roomId) || roomId <= 0) {
    return [];
  }

  const [roomRoleResult, roomNpcRoleResult] = await Promise.allSettled([
    tuanchat.roomRoleController.roomRole(roomId),
    tuanchat.roomRoleController.roomNpcRole(roomId),
  ]);

  const roles: Array<UserRole | null | undefined> = [];
  if (roomRoleResult.status === "fulfilled") {
    roles.push(...(roomRoleResult.value.data ?? []));
  }
  if (roomNpcRoleResult.status === "fulfilled") {
    roles.push(...(roomNpcRoleResult.value.data ?? []));
  }

  return normalizeRoleList(roles);
}

async function listBlocksuiteSpaceMentionRoles(spaceId: number): Promise<BlocksuiteMentionRoleEntry[]> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return [];
  }

  const response = await tuanchat.spaceRepositoryController.spaceRole(spaceId);
  return normalizeRoleList(response.data ?? []);
}

export async function listBlocksuiteMentionRoles(params: {
  spaceId?: number;
  currentDocId?: string;
}): Promise<BlocksuiteMentionRoleEntry[]> {
  const { spaceId, currentDocId } = params;
  const docDescriptor = currentDocId ? parseSpaceDocId(currentDocId) : null;

  if (docDescriptor?.kind === "room_description") {
    const roomRoles = await listBlocksuiteRoomMentionRoles(docDescriptor.roomId);
    if (roomRoles.length > 0) {
      return roomRoles;
    }
  }

  try {
    return await listBlocksuiteSpaceMentionRoles(Number(spaceId));
  }
  catch {
    return [];
  }
}
