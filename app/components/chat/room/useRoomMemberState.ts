import { useMemo } from "react";

import type { SpaceMember } from "../../../../api";

import { useGetMemberListQuery } from "../../../../api/hooks/chatQueryHooks";

type UseRoomMemberStateParams = {
  roomId: number;
  userId: number | null;
  spaceMembers: SpaceMember[];
};

type UseRoomMemberStateResult = {
  members: SpaceMember[];
  curMember: SpaceMember | undefined;
  isSpectator: boolean;
  notMember: boolean;
};

export default function useRoomMemberState({
  roomId,
  userId,
  spaceMembers,
}: UseRoomMemberStateParams): UseRoomMemberStateResult {
  const membersQuery = useGetMemberListQuery(roomId);
  const members = useMemo(() => {
    const roomMembers = membersQuery.data?.data ?? [];
    if (!spaceMembers.length) {
      return roomMembers;
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
