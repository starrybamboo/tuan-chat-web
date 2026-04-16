export type MemberPreviewItem = {
  memberType?: number | null;
  userId?: number | null;
  username?: string | null;
};

function getMemberTypeSortWeight(memberType?: number | null): number {
  switch (memberType) {
    case 1:
      return 0;
    case 5:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    default:
      return 99;
  }
}

export function getSpaceMemberTypeLabel(memberType?: number | null): string {
  switch (memberType) {
    case 1:
      return "主持";
    case 5:
      return "副主持";
    case 2:
      return "玩家";
    case 3:
      return "观战";
    case 4:
      return "骰娘";
    default:
      return "待识别";
  }
}

export function getMemberDisplayName(member: MemberPreviewItem): string {
  const username = member.username?.trim();
  if (username) {
    return username;
  }

  if (typeof member.userId === "number" && member.userId > 0) {
    return `用户 #${member.userId}`;
  }

  return "未命名成员";
}

export function hasHostMemberType(memberType?: number | null): boolean {
  return memberType === 1 || memberType === 5;
}

export function sortMemberPreviewItems<T extends MemberPreviewItem>(members: T[]): T[] {
  return [...members].sort((left, right) => {
    const weightDiff = getMemberTypeSortWeight(left.memberType) - getMemberTypeSortWeight(right.memberType);
    if (weightDiff !== 0) {
      return weightDiff;
    }

    const displayNameDiff = getMemberDisplayName(left).localeCompare(getMemberDisplayName(right), "zh-CN");
    if (displayNameDiff !== 0) {
      return displayNameDiff;
    }

    return (left.userId ?? 0) - (right.userId ?? 0);
  });
}

export function mergeRoomMembersWithSpaceMembers<T extends MemberPreviewItem>(
  roomMembers: T[],
  spaceMembers: MemberPreviewItem[],
): Array<T & { memberType?: number | null }> {
  const spaceMemberTypeByUserId = new Map<number, number | null | undefined>();
  spaceMembers.forEach((member) => {
    if (typeof member.userId === "number") {
      spaceMemberTypeByUserId.set(member.userId, member.memberType);
    }
  });

  return sortMemberPreviewItems(roomMembers.map((member) => {
    const memberType = typeof member.userId === "number"
      ? spaceMemberTypeByUserId.get(member.userId)
      : undefined;
    return {
      ...member,
      memberType,
    };
  }));
}

export function findCurrentMember<T extends MemberPreviewItem>(
  members: T[],
  currentUserId: number | null | undefined,
): T | null {
  if (typeof currentUserId !== "number") {
    return null;
  }

  return members.find(member => member.userId === currentUserId) ?? null;
}

export function getCurrentMemberIdentityText(member: MemberPreviewItem | null): string {
  return `当前身份：${getSpaceMemberTypeLabel(member?.memberType)}`;
}

export function getCurrentRoomPresenceText(
  roomMember: MemberPreviewItem | null,
  spaceMember: MemberPreviewItem | null,
): string {
  if (roomMember) {
    return "你已在当前房间成员列表中。";
  }

  const memberType = spaceMember?.memberType;
  if (hasHostMemberType(memberType)) {
    return `你当前是${getSpaceMemberTypeLabel(memberType)}，即使没有 room member 记录也可查看该房间。`;
  }

  if (typeof memberType === "number") {
    return `你当前是${getSpaceMemberTypeLabel(memberType)}，暂未进入当前房间成员列表。`;
  }

  return "当前成员身份尚未识别。";
}
