import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";

import { mobileApiClient } from "@/lib/api";
import { addRoomMemberWithSuccessGuard } from "./roomMemberMutation";

export function useAddRoomMemberMutation(roomId: number, spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => addRoomMemberWithSuccessGuard(mobileApiClient, {
      roomId,
      userIdList: [userId],
    }),
    mutationKey: ["addRoomMember", roomId],
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: getRoomMembersQueryKey(roomId) });
      void queryClient.invalidateQueries({ queryKey: getSpaceMembersQueryKey(spaceId) });
    },
  });
}
