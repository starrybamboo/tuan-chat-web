import { useUserStickersQuery as useSharedUserStickersQuery } from "@tuanchat/query/stickers";

import { mobileApiClient } from "@/lib/api";

/**
 * 获取当前用户的表情包列表。
 */
export function useUserStickersQuery(enabled = true) {
  return useSharedUserStickersQuery(mobileApiClient, { enabled });
}
