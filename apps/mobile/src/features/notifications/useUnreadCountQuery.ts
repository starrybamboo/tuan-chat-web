import { mobileApiClient } from "@/lib/api";
import { useNotificationUnreadCountQuery as useSharedNotificationUnreadCountQuery } from "@tuanchat/query/notifications";

export function useUnreadCountQuery(enabled: boolean) {
  const query = useSharedNotificationUnreadCountQuery(mobileApiClient, enabled);
  return {
    ...query,
    data: query.data?.data?.unreadCount ?? 0,
  };
}
