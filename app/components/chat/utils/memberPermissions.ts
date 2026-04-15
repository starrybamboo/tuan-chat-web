export const SPACE_MEMBER_TYPE = {
  LEADER: 1,
  PLAYER: 2,
  OBSERVER: 3,
  BOT: 4,
  ASSISTANT_LEADER: 5,
} as const;

export function hasHostPrivileges(memberType?: number | null): boolean {
  return memberType === SPACE_MEMBER_TYPE.LEADER || memberType === SPACE_MEMBER_TYPE.ASSISTANT_LEADER;
}

export function canManageMemberPermissions(memberType?: number | null): boolean {
  return memberType === SPACE_MEMBER_TYPE.LEADER;
}

export function canInviteSpectators(memberType?: number | null): boolean {
  return memberType != null;
}

export function isObserverLike(memberType?: number | null): boolean {
  return memberType == null
    || memberType === SPACE_MEMBER_TYPE.OBSERVER
    || memberType === SPACE_MEMBER_TYPE.BOT;
}

export function canParticipateInRoom(memberType?: number | null): boolean {
  return memberType === SPACE_MEMBER_TYPE.PLAYER || hasHostPrivileges(memberType);
}

export function canManageRoomRoles(memberType?: number | null): boolean {
  return canParticipateInRoom(memberType);
}

export function canViewRoomNpcRoles(memberType?: number | null): boolean {
  return memberType !== SPACE_MEMBER_TYPE.PLAYER;
}

export function getMemberTypeSortWeight(memberType?: number | null): number {
  switch (memberType) {
    case SPACE_MEMBER_TYPE.LEADER:
      return 0;
    case SPACE_MEMBER_TYPE.ASSISTANT_LEADER:
      return 1;
    case SPACE_MEMBER_TYPE.PLAYER:
      return 2;
    case SPACE_MEMBER_TYPE.OBSERVER:
      return 3;
    case SPACE_MEMBER_TYPE.BOT:
      return 4;
    default:
      return 99;
  }
}
