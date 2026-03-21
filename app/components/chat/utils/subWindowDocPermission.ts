import type { SpaceMember } from "api";

import { hasHostPrivileges } from "./memberPermissions";

type ResolveSubWindowDocPermissionParams = {
  isKpInMembers: boolean;
  isSpaceOwner: boolean;
  isMemberPermissionResolved: boolean;
  cachedIsKp: boolean;
};

export function checkIsKpInSpaceMembers(spaceMembers: SpaceMember[], userId: number): boolean {
  if (!Number.isFinite(userId) || userId <= 0) {
    return false;
  }
  return spaceMembers.some(member => member.userId === userId && hasHostPrivileges(member.memberType));
}

export function resolveSubWindowDocPermission(params: ResolveSubWindowDocPermissionParams): boolean {
  if (params.isKpInMembers || params.isSpaceOwner) {
    return true;
  }
  if (!params.isMemberPermissionResolved && params.cachedIsKp) {
    return true;
  }
  return false;
}
