import { useMemo } from "react";
import { hasHostPrivileges, isObserverLike } from "@/components/chat/utils/memberPermissions";

import type { RoomMember, SpaceMember } from "../../../../api";

import { useGetMemberListQuery } from "../../../../api/hooks/chatQueryHooks";

type UseRoomMemberStateParams = {
  roomId: number;
  userId: number | null;
  spaceMembers: SpaceMember[];
};

type UseRoomMemberStateResult = {
  members: RoomMemberWithSpace[];
  curMember: RoomMemberWithSpace | undefined;
  isSpectator: boolean;
  notMember: boolean;
};

export type RoomMemberWithSpace = RoomMember & SpaceMember;

type ResolveRoomMemberStateParams = {
  roomId: number;
  roomMembers: RoomMember[];
  userId: number | null;
  spaceMembers: SpaceMember[];
};

export function resolveRoomMemberState({
  roomId,
  roomMembers,
  userId,
  spaceMembers,
}: ResolveRoomMemberStateParams): UseRoomMemberStateResult {
  const spaceMemberByUserId = new Map<number, SpaceMember>();
  for (const member of spaceMembers) {
    if (typeof member.userId === "number") {
      spaceMemberByUserId.set(member.userId, member);
    }
  }

  const members = roomMembers.map((member) => {
    const spaceMember = typeof member.userId === "number"
      ? spaceMemberByUserId.get(member.userId)
      : undefined;
    return {
      ...member,
      ...spaceMember,
      // room_member 里只会有可参与房间的成员，未合并到 spaceMembers 时按玩家兜底，
      // 避免查询先后顺序导致输入框被误锁成“观战”。
      memberType: spaceMember?.memberType ?? 2,
    } satisfies RoomMemberWithSpace;
  });

  let curMember = typeof userId === "number"
    ? members.find(member => member.userId === userId)
    : undefined;

  if (!curMember && typeof userId === "number") {
    const spaceMember = spaceMemberByUserId.get(userId);
    if (spaceMember && typeof spaceMember.memberType === "number" && hasHostPrivileges(spaceMember.memberType)) {
      // 主持人可以查看并操作空间内所有房间；即使当前房间没有 room_member 记录，
      // 前端也不能把他降级成观战。
      curMember = {
        roomId,
        memberType: spaceMember.memberType,
        ...spaceMember,
      } satisfies RoomMemberWithSpace;
    }
  }

  const isSpectator = isObserverLike(curMember?.memberType);
  const notMember = isSpectator;

  return {
    members,
    curMember,
    isSpectator,
    notMember,
  };
}

export default function useRoomMemberState({
  roomId,
  userId,
  spaceMembers,
}: UseRoomMemberStateParams): UseRoomMemberStateResult {
  const membersQuery = useGetMemberListQuery(roomId);
  const roomMemberState = useMemo(() => {
    return resolveRoomMemberState({
      roomId,
      roomMembers: membersQuery.data?.data ?? [],
      userId,
      spaceMembers,
    });
  }, [membersQuery.data?.data, roomId, spaceMembers, userId]);

  return {
    members: roomMemberState.members,
    curMember: roomMemberState.curMember,
    isSpectator: roomMemberState.isSpectator,
    notMember: roomMemberState.notMember,
  };
}
