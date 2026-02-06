import { useCallback, useMemo } from "react";

import type { SpaceContextType } from "@/components/chat/core/spaceContext";

import type { Space, SpaceMember } from "../../../../api";

type UseChatPageSpaceContextParams = {
  activeRoomId?: number | null;
  activeSpaceId?: number | null;
  globalUserId?: number | null;
  setActiveRoomId: (roomId: number | null) => void;
  setActiveSpaceId: (spaceId: number | null) => void;
  spaces: Space[];
  spaceMembers: SpaceMember[];
  spaceRoomIdsByUser: Record<string, Record<string, number[]>>;
  toggleLeftDrawer: () => void;
  unreadMessagesNumber: Record<number, number>;
  userId: number;
};

type UseChatPageSpaceContextResult = {
  getSpaceUnreadMessagesNumber: (spaceId: number) => number;
  isSpaceOwner: boolean;
  spaceContext: SpaceContextType;
};

export default function useChatPageSpaceContext({
  activeRoomId,
  activeSpaceId,
  globalUserId,
  setActiveRoomId,
  setActiveSpaceId,
  spaces,
  spaceMembers,
  spaceRoomIdsByUser,
  toggleLeftDrawer,
  unreadMessagesNumber,
  userId,
}: UseChatPageSpaceContextParams): UseChatPageSpaceContextResult {
  const spaceContext = useMemo((): SpaceContextType => {
    return {
      spaceId: activeSpaceId ?? -1,
      isSpaceOwner: !!spaceMembers.some(member => member.userId === globalUserId && member.memberType === 1),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      ruleId: spaces.find(space => space.spaceId === activeSpaceId)?.ruleId,
      spaceMembers,
    };
  }, [activeSpaceId, globalUserId, setActiveRoomId, setActiveSpaceId, spaceMembers, spaces, toggleLeftDrawer]);

  const getSpaceUnreadMessagesNumber = useCallback((spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  }, [activeRoomId, spaceRoomIdsByUser, unreadMessagesNumber, userId]);

  return {
    getSpaceUnreadMessagesNumber,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    spaceContext,
  };
}
