import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { useQuery } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useFriendsQuery() {
  return useQuery<FriendResponse[]>({
    queryFn: async () => {
      const res = await mobileApiClient.friendController.getFriendList({ pageNo: 1, pageSize: 200 });
      return res.data ?? [];
    },
    queryKey: ["friends"],
    staleTime: 60_000,
  });
}
