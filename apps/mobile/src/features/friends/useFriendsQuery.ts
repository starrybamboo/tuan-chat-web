import { useFriendsQuery as useSharedFriendsQuery } from "@tuanchat/query/friends";

import { mobileApiClient } from "@/lib/api";

export function useFriendsQuery() {
  return useSharedFriendsQuery(mobileApiClient);
}
