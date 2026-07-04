import { createFileRoute } from "@tanstack/react-router";

import {
  fetchNotificationsFirstPageWithCache,
  fetchNotificationUnreadCountWithCache,
} from "@/components/notification/notificationHooks";
import NotificationPage from "@/components/notification/notificationPage";
import { queryClient } from "@/queryClient";
import { createSeoMeta } from "@/utils/seo";

export function meta() {
  return createSeoMeta({
    title: "通知中心",
    description: "查看团剧共创中的消息通知与提醒。",
    path: "/notifications",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/notifications")({
  loader: async () => {
    await Promise.allSettled([
      fetchNotificationUnreadCountWithCache(queryClient),
      fetchNotificationsFirstPageWithCache(queryClient, { pageSize: 20, unreadOnly: false }),
    ]);
    return null;
  },
  head: () => ({
    meta: meta(),
  }),
  component: Notifications,
});

function Notifications() {
  return <NotificationPage />;
}
