import { useNotificationUnreadCountQuery as useSharedNotificationUnreadCountQuery } from "@tuanchat/query/notifications";

import { mobileApiClient } from "@/lib/api";

export function useUnreadCountQuery(enabled: boolean) {
  const query = useSharedNotificationUnreadCountQuery(mobileApiClient, enabled);
  return {
    ...query,
    data: query.data?.data?.unreadCount ?? 0,
  };
}
