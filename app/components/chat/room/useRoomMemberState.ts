import { useMemo } from "react";

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

type RoomMemberWithSpace = RoomMember & SpaceMember;

export default function useRoomMemberState({
  roomId,
  userId,
  spaceMembers,
}: UseRoomMemberStateParams): UseRoomMemberStateResult {
  const membersQuery = useGetMemberListQuery(roomId);
  const members = useMemo<RoomMemberWithSpace[]>(() => {
    const roomMembers = membersQuery.data?.data ?? [];
    if (!spaceMembers.length) {
      return roomMembers as RoomMemberWithSpace[];
    }
    return roomMembers.map((member) => {
      const spaceMember = spaceMembers.find(m => m.userId === member.userId);
      return {
        ...member,
        ...spaceMember,
      };
    });
  }, [membersQuery.data?.data, spaceMembers]);

  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  const isSpectator = (curMember?.memberType ?? 3) >= 3;
  const notMember = isSpectator;

  return {
    members,
    curMember,
    isSpectator,
    notMember,
  };
}
