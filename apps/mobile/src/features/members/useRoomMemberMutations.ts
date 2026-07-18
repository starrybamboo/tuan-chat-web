import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  beginAddRoomMemberOptimisticMutation,
  getRoomMembersQueryKey,
  getSpaceMembersQueryKey,
} from "@tuanchat/query/members";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

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
    onMutate: userId => beginAddRoomMemberOptimisticMutation(queryClient, {
      roomId,
      spaceId,
      userId,
    }),
    onError: (_error, _userId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: getRoomMembersQueryKey(roomId) });
      void queryClient.invalidateQueries({ queryKey: getSpaceMembersQueryKey(spaceId) });
    },
  });
}
