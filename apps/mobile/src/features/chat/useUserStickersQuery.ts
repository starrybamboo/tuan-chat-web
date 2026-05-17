import { useQuery } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

/**
 * 获取当前用户的表情包列表。
 */
export function useUserStickersQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["getUserStickers"],
    queryFn: () => mobileApiClient.stickerController.getUserStickers(),
    staleTime: 300_000,
  });
}
