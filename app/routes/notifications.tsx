import NotificationPage from "@/components/notification/notificationPage";
import { createSeoMeta } from "@/utils/seo";

export function meta() {
  return createSeoMeta({
    title: "通知中心",
    description: "查看团剧共创中的消息通知与提醒。",
    path: "/notifications",
    index: false,
  });
}

export default function Notifications() {
  return <NotificationPage />;
}
