import { useFriendRequestsQuery as useSharedFriendRequestsQuery } from "@tuanchat/query/friends";

import { mobileApiClient } from "@/lib/api";

export function useFriendRequestsQuery() {
  return useSharedFriendRequestsQuery(mobileApiClient);
}
