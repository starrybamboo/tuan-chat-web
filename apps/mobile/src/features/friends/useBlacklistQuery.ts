import { useQuery } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useBlacklistQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const res = await mobileApiClient.friendController.getBlackList({ pageNo: 1, pageSize: 50 });
      return (res as any).data?.list ?? res ?? [];
    },
    queryKey: ["blacklist"],
    staleTime: 30_000,
  });
}
