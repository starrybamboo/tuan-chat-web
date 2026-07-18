import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSpaceMembersQueryKey } from "@tuanchat/query/members";

import { mobileApiClient } from "@/lib/api";

import { inviteSpaceMember } from "./spaceMemberInviteMutation";

export function useAddSpaceMemberMutation(spaceId: number, inviteAsPlayer = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => inviteSpaceMember(mobileApiClient.spaceMemberController, {
      inviteAsPlayer,
      spaceId,
      userId,
    }),
    mutationKey: ["addSpaceMember", spaceId, inviteAsPlayer ? "player" : "spectator"],
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: getSpaceMembersQueryKey(spaceId) });
    },
  });
}
