import NotificationPage from "@/components/notification/notificationPage";

export function meta() {
  return [
    { title: "通知 - tuan-chat" },
    { name: "description", content: "通知中心" },
  ];
}

export default function Notifications() {
  return <NotificationPage />;
}
