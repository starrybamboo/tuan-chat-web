import { useQuery } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useFriendRequestsQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await mobileApiClient.friendController.getFriendRequestPage({ pageNo: 1, pageSize: 50 });
      return res.data?.list ?? [];
    },
    queryKey: ["friendRequests"],
    staleTime: 30_000,
  });
}
