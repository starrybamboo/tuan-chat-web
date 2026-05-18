import { useBlacklistQuery as useSharedBlacklistQuery } from "@tuanchat/query/friends";

import { mobileApiClient } from "@/lib/api";

export function useBlacklistQuery(enabled: boolean) {
  return useSharedBlacklistQuery(mobileApiClient, enabled);
}
