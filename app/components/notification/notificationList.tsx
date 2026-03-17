import type { UserNotificationItem } from "@/components/notification/notificationTypes";

import { formatNotificationTime } from "@/components/notification/notificationTypes";

type NotificationListProps = {
  items: UserNotificationItem[];
  emptyText: string;
  loading?: boolean;
  busyNotificationId?: number | null;
  onItemClick: (item: UserNotificationItem) => void | Promise<void>;
};

export default function NotificationList({
  items,
  emptyText,
  loading = false,
  busyNotificationId = null,
  onItemClick,
}: NotificationListProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm opacity-70">
        正在加载通知...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-100 px-4 text-center text-sm opacity-70">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <button
          key={item.notificationId}
          type="button"
          className="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-left transition hover:border-primary/35 hover:bg-base-200 disabled:cursor-wait disabled:opacity-70"
          disabled={busyNotificationId === item.notificationId}
          onClick={() => void onItemClick(item)}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-base-300" : "bg-primary"}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm opacity-75">{item.content}</div>
                </div>
                <div className="shrink-0 text-xs opacity-60">{formatNotificationTime(item.createTime)}</div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
