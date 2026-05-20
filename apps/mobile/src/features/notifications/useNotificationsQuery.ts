import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getNotificationsQueryKey,
  useNotificationsInfiniteQuery as useSharedNotificationsInfiniteQuery,
} from "@tuanchat/query/notifications";

const PAGE_SIZE = 20;
const NOTIFICATIONS_FIRST_PAGE_SNAPSHOT_TTL_MS = 2 * 60_000;

export function useNotificationsInfiniteQuery(enabled: boolean) {
  return useSharedNotificationsInfiniteQuery(mobileApiClient, { pageSize: PAGE_SIZE }, { enabled });
}

// Keep backward-compatible export for existing consumers
export function useNotificationsQuery(enabled: boolean) {
  const { isAuthenticated, session } = useAuthSession();
  const query = useNotificationsInfiniteQuery(enabled);
  const items: NotificationItemResponse[] = query.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];
  const itemsSourceQuery: Omit<typeof query, "data"> & { data: NotificationItemResponse[] } = {
    ...query,
    data: items,
  };
  const itemsQuery = useMobileQuerySnapshot<NotificationItemResponse[], typeof itemsSourceQuery>(
    itemsSourceQuery,
    {
      enabled: canUseMobileUserScopedSnapshot({
        enabled: enabled && isAuthenticated,
        isAuthenticated,
        userId: session?.userId,
      }),
      key: createMobileQuerySnapshotKey(getNotificationsQueryKey({ pageSize: PAGE_SIZE })),
      preparePayload: data => data.slice(0, PAGE_SIZE),
      scope: "notifications-first-page",
      ttlMs: NOTIFICATIONS_FIRST_PAGE_SNAPSHOT_TTL_MS,
      userId: session?.userId,
    },
  );

  return {
    ...itemsQuery,
    data: itemsQuery.data ?? [],
    isPending: itemsQuery.isPending,
  };
}
