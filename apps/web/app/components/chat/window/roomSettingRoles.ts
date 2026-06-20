import type { UserRole } from "../../../../api";

import { canViewRoomNpcRoles } from "../utils/memberPermissions";

export type RoomSettingRoleView = {
  visibleNpcRoles: UserRole[];
  totalRoleCount: number;
};

export function canDisplayRoomSettingNpcRoles({
  isSpaceOwner,
  memberType,
}: {
  isSpaceOwner?: boolean;
  memberType?: number | null;
}): boolean {
  if (isSpaceOwner) {
    return true;
  }
  if (typeof memberType !== "number") {
    return false;
  }
  return canViewRoomNpcRoles(memberType);
}

export function buildRoomSettingRoleView({
  canViewNpcRoles,
  roomNpcRoles,
  roomRoles,
}: {
  canViewNpcRoles: boolean;
  roomNpcRoles: UserRole[];
  roomRoles: UserRole[];
}): RoomSettingRoleView {
  const visibleNpcRoles = canViewNpcRoles ? roomNpcRoles : [];

  return {
    visibleNpcRoles,
    totalRoleCount: roomRoles.length + visibleNpcRoles.length,
  };
}
