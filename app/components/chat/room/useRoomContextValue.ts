import { useMemo } from "react";

import type { RoomContextType } from "@/components/chat/core/roomContext";

type UseRoomContextValueParams = {
  roomId: number;
  roomMembers: RoomContextType["roomMembers"];
  curMember: RoomContextType["curMember"];
  roomRolesThatUserOwn: RoomContextType["roomRolesThatUserOwn"];
  curRoleId: RoomContextType["curRoleId"];
  curAvatarId: RoomContextType["curAvatarId"];
  spaceId: RoomContextType["spaceId"];
  chatHistory: RoomContextType["chatHistory"];
  scrollToGivenMessage: RoomContextType["scrollToGivenMessage"];
  isRealtimeRenderActive: boolean;
  jumpToMessageInWebGAL: RoomContextType["jumpToMessageInWebGAL"];
  updateAndRerenderMessageInWebGAL: RoomContextType["updateAndRerenderMessageInWebGAL"];
  rerenderHistoryInWebGAL: RoomContextType["rerenderHistoryInWebGAL"];
};

export default function useRoomContextValue({
  roomId,
  roomMembers,
  curMember,
  roomRolesThatUserOwn,
  curRoleId,
  curAvatarId,
  spaceId,
  chatHistory,
  scrollToGivenMessage,
  isRealtimeRenderActive,
  jumpToMessageInWebGAL,
  updateAndRerenderMessageInWebGAL,
  rerenderHistoryInWebGAL,
}: UseRoomContextValueParams): RoomContextType {
  return useMemo((): RoomContextType => ({
    roomId,
    roomMembers,
    curMember,
    roomRolesThatUserOwn,
    curRoleId,
    curAvatarId,
    spaceId,
    chatHistory,
    scrollToGivenMessage,
    jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
    updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
    rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
  }), [
    roomId,
    roomMembers,
    curMember,
    roomRolesThatUserOwn,
    curRoleId,
    curAvatarId,
    spaceId,
    chatHistory,
    scrollToGivenMessage,
    isRealtimeRenderActive,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
  ]);
}
