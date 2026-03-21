import type { UserNotificationItem } from "@/components/notification/notificationTypes";

import { BellIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
  useNotificationUnreadCountQuery,
  useNotificationsInfiniteQuery,
} from "@/components/notification/notificationHooks";
import NotificationList from "@/components/notification/notificationList";

export default function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(null);
  const unreadCountQuery = useNotificationUnreadCountQuery(true);
  const notificationQuery = useNotificationsInfiniteQuery({ pageSize: 8 }, { enabled: isOpen });
  const markReadMutation = useMarkNotificationsReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const notifications = useMemo(() => {
    return notificationQuery.data?.pages.flatMap(page => page.list) ?? [];
  }, [notificationQuery.data?.pages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const openNotification = async (item: UserNotificationItem) => {
    setBusyNotificationId(item.notificationId);
    try {
      if (!item.isRead) {
        await markReadMutation.mutateAsync({ notificationIdList: [item.notificationId] });
      }
      navigate(item.targetPath);
      setIsOpen(false);
    }
    finally {
      setBusyNotificationId(null);
    }
  };

  const handleReadAll = async () => {
    await markAllReadMutation.mutateAsync({});
  };

  return (
    <div ref={dropdownRef} className={`dropdown dropdown-end ${isOpen ? "dropdown-open" : ""}`}>
      <button
        type="button"
        className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
        aria-label="通知中心"
        onClick={() => setIsOpen(current => !current)}
      >
        <div className="indicator">
          <BellIcon className="size-6 opacity-80" />
          {unreadCount > 0
            ? (
                <span className="badge badge-primary badge-xs indicator-item px-1 text-[10px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )
            : null}
        </div>
      </button>

      <div className="dropdown-content z-50 mt-2 w-[min(92vw,24rem)] rounded-2xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">通知中心</div>
            <div className="text-xs opacity-60">反馈动态会在这里保留</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={unreadCount <= 0 || markAllReadMutation.isPending}
            onClick={() => void handleReadAll()}
          >
            全部已读
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
          <NotificationList
            items={notifications}
            emptyText="还没有通知。"
            loading={notificationQuery.isLoading}
            busyNotificationId={busyNotificationId}
            onItemClick={openNotification}
          />
        </div>

        <div className="border-t border-base-300 px-3 py-3">
          <Link
            to="/notifications"
            className="btn btn-outline btn-sm w-full"
            onClick={() => setIsOpen(false)}
          >
            查看全部通知
          </Link>
        </div>
      </div>
    </div>
  );
}
