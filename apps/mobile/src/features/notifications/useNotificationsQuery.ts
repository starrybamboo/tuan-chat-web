import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import { useNotificationsInfiniteQuery as useSharedNotificationsInfiniteQuery } from "@tuanchat/query/notifications";

import { mobileApiClient } from "@/lib/api";

const PAGE_SIZE = 20;

export function useNotificationsInfiniteQuery(enabled: boolean) {
  return useSharedNotificationsInfiniteQuery(mobileApiClient, { pageSize: PAGE_SIZE }, { enabled });
}

// Keep backward-compatible export for existing consumers
export function useNotificationsQuery(enabled: boolean) {
  const query = useNotificationsInfiniteQuery(enabled);
  const items: NotificationItemResponse[] = query.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];
  return {
    ...query,
    data: items,
    isPending: query.isPending,
  };
}
