import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseNotificationItemResponse";

import {
  getNotificationsQueryKey,
  getNotificationsUnreadCountQueryKey,
  useMarkAllNotificationsReadMutation as useSharedMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation as useSharedMarkNotificationsReadMutation,
  useNotificationsInfiniteQuery as useSharedNotificationsInfiniteQuery,
  useNotificationUnreadCountQuery as useSharedNotificationUnreadCountQuery,
} from "@tuanchat/query/notifications";
import { toWebNotificationPageData } from "api/notificationQueryCache";

import type {
  NotificationListFilters,
  NotificationReadAllPayload,
  NotificationReadPayload,
} from "@/components/notification/notificationTypes";

import { tuanchat } from "../../../api/instance";

export {
  markAllNotificationsReadInPageData,
  markNotificationsReadInPageData,
  prependNotificationToCaches,
  prependNotificationToPageData,
} from "api/notificationQueryCache";

type NotificationQueryOptions = {
  enabled?: boolean;
};

function normalizeNotificationFilters(filters: NotificationListFilters): Required<Pick<NotificationListFilters, "pageSize">> & NotificationListFilters {
  return {
    pageSize: filters.pageSize ?? 20,
    unreadOnly: filters.unreadOnly ?? false,
    category: filters.category ?? null,
  };
}

function toSharedNotificationFilters(filters: NotificationListFilters) {
  const normalized = normalizeNotificationFilters(filters);
  return {
    ...normalized,
    category: normalized.category ?? undefined,
  };
}

export function fetchNotificationsFirstPageWithCache(queryClient: QueryClient, filters: NotificationListFilters = {}) {
  const sharedFilters = toSharedNotificationFilters(filters);
  const pageSize = sharedFilters.pageSize ?? 20;
  const normalizedFilters = {
    ...sharedFilters,
    pageSize,
  };

  return queryClient.fetchInfiniteQuery({
    queryKey: getNotificationsQueryKey(normalizedFilters),
    queryFn: ({ pageParam }) => tuanchat.notificationController.pageNotifications({
      ...normalizedFilters,
      cursor: pageParam,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: ApiResultCursorPageBaseResponseNotificationItemResponse) => {
      if (!lastPage.data || lastPage.data.isLast) {
        return undefined;
      }
      return typeof lastPage.data.cursor === "number" ? lastPage.data.cursor : undefined;
    },
    staleTime: 30_000,
  });
}

export function fetchNotificationUnreadCountWithCache(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: getNotificationsUnreadCountQueryKey(),
    queryFn: () => tuanchat.notificationController.getUnreadCount(),
    staleTime: 15_000,
  });
}

export function useNotificationsInfiniteQuery(filters: NotificationListFilters, options: NotificationQueryOptions = {}) {
  const query = useSharedNotificationsInfiniteQuery(tuanchat, toSharedNotificationFilters(filters), {
    enabled: options.enabled ?? true,
  });

  return {
    ...query,
    data: toWebNotificationPageData(query.data),
  };
}

export function useNotificationUnreadCountQuery(enabled = true) {
  const query = useSharedNotificationUnreadCountQuery(tuanchat, enabled);
  return {
    ...query,
    data: query.data?.data
      ? { unreadCount: Number(query.data.data.unreadCount ?? 0) }
      : undefined,
  };
}

export function useMarkNotificationsReadMutation() {
  return useSharedMarkNotificationsReadMutation(tuanchat) as ReturnType<typeof useSharedMarkNotificationsReadMutation> & {
    mutate: (variables: NotificationReadPayload, options?: Parameters<ReturnType<typeof useSharedMarkNotificationsReadMutation>["mutate"]>[1]) => void;
  };
}

export function useMarkAllNotificationsReadMutation() {
  return useSharedMarkAllNotificationsReadMutation(tuanchat) as ReturnType<typeof useSharedMarkAllNotificationsReadMutation> & {
    mutate: (variables?: NotificationReadAllPayload, options?: Parameters<ReturnType<typeof useSharedMarkAllNotificationsReadMutation>["mutate"]>[1]) => void;
  };
}
