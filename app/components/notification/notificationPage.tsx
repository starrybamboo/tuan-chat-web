import type { UserNotificationItem } from "@/components/notification/notificationTypes";

import { startTransition, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useGlobalUserId } from "@/components/globalContextProvider";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
  useNotificationsInfiniteQuery,
  useNotificationUnreadCountQuery,
} from "@/components/notification/notificationHooks";
import NotificationList from "@/components/notification/notificationList";

export default function NotificationPage() {
  const navigate = useNavigate();
  const userId = useGlobalUserId();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(null);
  const unreadCountQuery = useNotificationUnreadCountQuery(Boolean(userId));
  const notificationsQuery = useNotificationsInfiniteQuery(
    { pageSize: 20, unreadOnly },
    { enabled: Boolean(userId) },
  );
  const markReadMutation = useMarkNotificationsReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications = useMemo(() => {
    return notificationsQuery.data?.pages.flatMap(page => page.list) ?? [];
  }, [notificationsQuery.data?.pages]);

  const openNotification = async (item: UserNotificationItem) => {
    setBusyNotificationId(item.notificationId);
    try {
      if (!item.isRead) {
        await markReadMutation.mutateAsync({ notificationIdList: [item.notificationId] });
      }
      startTransition(() => {
        navigate(item.targetPath);
      });
    }
    finally {
      setBusyNotificationId(null);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-full bg-base-200">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10">
          <div className="rounded-3xl border border-base-300 bg-base-100 px-6 py-8 text-center shadow-sm">
            <div className="text-xl font-semibold">通知中心</div>
            <div className="mt-2 text-sm opacity-70">请先登录后查看你的反馈通知。</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-base-200">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-base-300 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-base-content/45">Notification Center</div>
              <h1 className="mt-2 text-3xl font-semibold">通知中心</h1>
              <p className="mt-2 text-sm opacity-70">反馈的创建、状态变更、评论和回复会持久化记录在这里。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${!unreadOnly ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setUnreadOnly(false)}
              >
                全部
              </button>
              <button
                type="button"
                className={`btn btn-sm ${unreadOnly ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setUnreadOnly(true)}
              >
                未读
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={(unreadCountQuery.data?.unreadCount ?? 0) <= 0 || markAllReadMutation.isPending}
                onClick={() => void markAllReadMutation.mutateAsync({})}
              >
                全部已读
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            <NotificationList
              items={notifications}
              emptyText={unreadOnly ? "当前没有未读通知。" : "还没有通知。"}
              loading={notificationsQuery.isLoading}
              busyNotificationId={busyNotificationId}
              onItemClick={openNotification}
            />

            {notificationsQuery.hasNextPage
              ? (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={notificationsQuery.isFetchingNextPage}
                      onClick={() => void notificationsQuery.fetchNextPage()}
                    >
                      {notificationsQuery.isFetchingNextPage ? "正在加载..." : "加载更多"}
                    </button>
                  </div>
                )
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
