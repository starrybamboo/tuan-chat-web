import { BellIcon } from "@phosphor-icons/react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { UserNotificationItem } from "@/components/notification/notificationTypes";

import { Button, buttonClassName } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { useDismissibleLayer } from "@/components/common/customHooks/useDismissibleLayer";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import { StateView } from "@/components/common/StateView";
import { CountBadge, StatusIndicator } from "@/components/common/StatusPrimitives";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
  useNotificationsInfiniteQuery,
  useNotificationUnreadCountQuery,
} from "@/components/notification/notificationHooks";
import {
  normalizeNotificationTargetPath,
  NOTIFICATION_TARGET_FALLBACK_PATH,
} from "@/components/notification/notificationNavigation";
import { scheduleNonCriticalTask } from "@/utils/scheduleNonCriticalTask";

const LazyNotificationList = lazy(() => import("@/components/notification/notificationList"));

export default function NotificationBell() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(null);
  const [shouldLoadUnreadCount, setShouldLoadUnreadCount] = useState(false);
  const unreadCountQuery = useNotificationUnreadCountQuery(shouldLoadUnreadCount || isOpen);
  const notificationQuery = useNotificationsInfiniteQuery({ pageSize: 8 }, { enabled: isOpen });
  const markReadMutation = useMarkNotificationsReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const notificationButtonLabel = unreadCount > 0
    ? `通知中心，${unreadCount > 99 ? "99 条以上" : `${unreadCount} 条`}未读`
    : "通知中心，暂无未读";
  const notifications = useMemo(() => {
    return notificationQuery.data?.pages.flatMap(page => page.list) ?? [];
  }, [notificationQuery.data?.pages]);

  useEffect(() => {
    if (shouldLoadUnreadCount) {
      return;
    }
    if (isOpen) {
      setShouldLoadUnreadCount(true);
      return;
    }
    return scheduleNonCriticalTask(() => {
      setShouldLoadUnreadCount(true);
    });
  }, [isOpen, shouldLoadUnreadCount]);

  useDismissibleLayer({
    enabled: isOpen,
    containerRef: dropdownRef,
    onDismiss: () => setIsOpen(false),
  });

  const openNotification = async (item: UserNotificationItem) => {
    const targetPath = normalizeNotificationTargetPath(item.targetPath);
    if (!targetPath) {
      appToast.error("通知目标链接无效，已返回通知中心");
      router.history.push(NOTIFICATION_TARGET_FALLBACK_PATH);
      setIsOpen(false);
      return;
    }

    setBusyNotificationId(item.notificationId);
    try {
      if (!item.isRead) {
        await markReadMutation.mutateAsync({ notificationIdList: [item.notificationId] });
      }
      router.history.push(targetPath);
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
    <div
      ref={dropdownRef}
      data-dismissible-layer={isOpen ? "true" : undefined}
      className="relative inline-flex"
    >
      <motion.button
        type="button"
        className={buttonClassName({
          variant: "ghost",
          size: "sm",
          shape: "circle",
          className: "hover:bg-base-200",
        })}
        aria-label={notificationButtonLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(current => !current)}
        {...interactiveButtonMotionProps}
      >
        <StatusIndicator
          indicator={unreadCount > 0
            ? (
                <CountBadge tone="info">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </CountBadge>
              )
            : null}
        >
          <BellIcon className="size-6 opacity-80" />
        </StatusIndicator>
      </motion.button>

      {isOpen
        ? (
            <div className={surfaceClassName({
              level: "floating",
              className: "absolute right-0 top-full z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden p-0 shadow-xl",
            })}>
              <div className="
                flex items-center justify-between border-b border-base-300 px-4
                py-3
              ">
                <div>
                  <div className="text-sm font-semibold">通知中心</div>
                  <div className="text-xs opacity-60">反馈动态会在这里保留</div>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  loading={markAllReadMutation.isPending}
                  disabled={unreadCount <= 0 || markAllReadMutation.isPending}
                  onClick={() => void handleReadAll()}
                >
                  全部已读
                </Button>
              </div>

              <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
                <Suspense fallback={<StateView loading title="正在加载通知" className="min-h-40 py-8" />}>
                  <LazyNotificationList
                    items={notifications}
                    emptyText="还没有通知。"
                    loading={notificationQuery.isLoading}
                    busyNotificationId={busyNotificationId}
                    onItemClick={openNotification}
                  />
                </Suspense>
              </div>

              <div className="border-t border-base-300 px-3 py-3">
                <Link
                  to="/notifications"
                  className={buttonClassName({
                    variant: "outline",
                    size: "sm",
                    className: "w-full rounded-md",
                  })}
                  onClick={() => setIsOpen(false)}
                >
                  查看全部通知
                </Link>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
