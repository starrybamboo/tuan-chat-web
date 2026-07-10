import type { MobileRoomRoleSelectionSnapshot } from "./mobileRoomRoleSelectionState";

import { readMobileKeyValue, writeMobileKeyValue } from "../../lib/mobile-key-value-storage";
import { normalizeMobileRoomRoleSelectionSnapshot } from "./mobileRoomRoleSelectionState";
export { resolveMobileRoomRoleSelection } from "./mobileRoomRoleSelectionState";
export type {
  MobileRoomRoleSelectionSnapshot,
  ResolvedMobileRoomRoleSelection,
} from "./mobileRoomRoleSelectionState";

const ROOM_ROLE_SELECTION_STORAGE_SCOPE = "mobile-room-role-selection-v1";
const memorySelectionByUserAndRoom = new Map<string, MobileRoomRoleSelectionSnapshot>();

function getRoomRoleSelectionKey(roomId: number) {
  return `room:${roomId}`;
}

function getMemorySelectionKey(roomId: number, userId: number | null | undefined) {
  return `${Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : 0}:${roomId}`;
}

function isValidRoomId(roomId: number | null | undefined): roomId is number {
  return Number.isInteger(roomId) && Number(roomId) > 0;
}

export async function readMobileRoomRoleSelection(
  roomId: number | null | undefined,
  userId: number | null | undefined,
): Promise<MobileRoomRoleSelectionSnapshot | null> {
  if (!isValidRoomId(roomId)) {
    return null;
  }

  const cached = memorySelectionByUserAndRoom.get(getMemorySelectionKey(roomId, userId));
  if (cached) {
    return cached;
  }

  const entry = await readMobileKeyValue<MobileRoomRoleSelectionSnapshot>(
    getRoomRoleSelectionKey(roomId),
    {
      scope: ROOM_ROLE_SELECTION_STORAGE_SCOPE,
      userId,
    },
  );
  if (!entry?.value) {
    return null;
  }

  const snapshot = normalizeMobileRoomRoleSelectionSnapshot(entry.value);
  memorySelectionByUserAndRoom.set(getMemorySelectionKey(roomId, userId), snapshot);
  return snapshot;
}

export async function writeMobileRoomRoleSelection(params: {
  avatarFileId?: number;
  avatarId?: number;
  customRoleName?: string;
  roomId: number | null | undefined;
  roleId?: number;
  userId: number | null | undefined;
}) {
  if (!isValidRoomId(params.roomId)) {
    return;
  }

  const snapshot = normalizeMobileRoomRoleSelectionSnapshot({
    avatarFileId: params.avatarFileId,
    avatarId: params.avatarId,
    customRoleName: params.customRoleName,
    roleId: params.roleId,
  });
  memorySelectionByUserAndRoom.set(getMemorySelectionKey(params.roomId, params.userId), snapshot);

  await writeMobileKeyValue(
    getRoomRoleSelectionKey(params.roomId),
    snapshot,
    {
      scope: ROOM_ROLE_SELECTION_STORAGE_SCOPE,
      userId: params.userId,
    },
  );
}
