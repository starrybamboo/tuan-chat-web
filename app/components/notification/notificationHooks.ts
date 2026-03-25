import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  NotificationListFilters,
  NotificationPageResponse,
  NotificationReadAllPayload,
  NotificationReadPayload,
  NotificationUnreadCountResponse,
  UserNotificationItem,
} from "@/components/notification/notificationTypes";

import {
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
  pageNotifications,
} from "@/components/notification/notificationApi";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ["notificationsUnreadCount"] as const;

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

function extractFiltersFromQueryKey(queryKey: QueryKey): NotificationListFilters {
  if (!Array.isArray(queryKey) || queryKey.length < 2) {
    return {};
  }
  const candidate = queryKey[1];
  if (!candidate || typeof candidate !== "object") {
    return {};
  }
  return candidate as NotificationListFilters;
}

function buildCacheDateTimeString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function notificationMatchesFilters(item: UserNotificationItem, filters: NotificationListFilters) {
  if (filters.category && item.category !== filters.category) {
    return false;
  }
  if (filters.unreadOnly && item.isRead) {
    return false;
  }
  return true;
}

function hasNotificationId(data: InfiniteData<NotificationPageResponse> | undefined, notificationId: number) {
  if (!data) {
    return false;
  }
  return data.pages.some(page => page.list.some(item => item.notificationId === notificationId));
}

export function prependNotificationToPageData(
  data: InfiniteData<NotificationPageResponse> | undefined,
  item: UserNotificationItem,
  filters: NotificationListFilters = {},
) {
  if (!data || !notificationMatchesFilters(item, filters)) {
    return data;
  }
  if (hasNotificationId(data, item.notificationId)) {
    return data;
  }

  let changed = false;
  const pages = data.pages.map((page, pageIndex) => {
    const list = page.list.filter(existing => existing.notificationId !== item.notificationId);
    if (list.length !== page.list.length) {
      changed = true;
    }

    if (pageIndex === 0) {
      changed = true;
      return {
        ...page,
        cursor: page.cursor ?? item.notificationId,
        list: [item, ...list],
      };
    }

    return list.length === page.list.length ? page : { ...page, list };
  });

  return changed ? { ...data, pages } : data;
}

export function markNotificationsReadInPageData(
  data: InfiniteData<NotificationPageResponse> | undefined,
  notificationIdList: number[],
  filters: NotificationListFilters = {},
  readTime = buildCacheDateTimeString(new Date()),
) {
  if (!data || notificationIdList.length === 0) {
    return data;
  }

  const idSet = new Set(notificationIdList);
  let changed = false;
  const pages = data.pages.map((page) => {
    if (filters.unreadOnly) {
      const list = page.list.filter(item => !idSet.has(item.notificationId));
      if (list.length !== page.list.length) {
        changed = true;
        return { ...page, list };
      }
      return page;
    }

    let pageChanged = false;
    const list = page.list.map((item) => {
      if (!idSet.has(item.notificationId) || item.isRead) {
        return item;
      }
      pageChanged = true;
      changed = true;
      return {
        ...item,
        isRead: true,
        readTime,
      };
    });
    return pageChanged ? { ...page, list } : page;
  });

  return changed ? { ...data, pages } : data;
}

export function markAllNotificationsReadInPageData(
  data: InfiniteData<NotificationPageResponse> | undefined,
  filters: NotificationListFilters = {},
  category?: string | null,
  readTime = buildCacheDateTimeString(new Date()),
) {
  if (!data) {
    return data;
  }

  let changed = false;
  const pages = data.pages.map((page) => {
    if (filters.unreadOnly) {
      const list = page.list.filter((item) => {
        const shouldRemove = !category || item.category === category;
        if (shouldRemove) {
          changed = true;
          return false;
        }
        return true;
      });
      return list.length !== page.list.length ? { ...page, list } : page;
    }

    let pageChanged = false;
    const list = page.list.map((item) => {
      const shouldMarkRead = !category || item.category === category;
      if (!shouldMarkRead || item.isRead) {
        return item;
      }
      pageChanged = true;
      changed = true;
      return {
        ...item,
        isRead: true,
        readTime,
      };
    });
    return pageChanged ? { ...page, list } : page;
  });

  return changed ? { ...data, pages } : data;
}

export function prependNotificationToCaches(queryClient: QueryClient, item: UserNotificationItem) {
  const queryEntries = queryClient.getQueriesData<InfiniteData<NotificationPageResponse>>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
  });
  const known = queryEntries.some(([, data]) => hasNotificationId(data, item.notificationId));

  queryEntries.forEach(([queryKey, data]) => {
    const filters = extractFiltersFromQueryKey(queryKey);
    const nextData = prependNotificationToPageData(data, item, filters);
    if (nextData !== data) {
      queryClient.setQueryData(queryKey, nextData);
    }
  });

  if (!known) {
    queryClient.setQueryData<NotificationUnreadCountResponse>(
      NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
      current => ({ unreadCount: Math.max(0, (current?.unreadCount ?? 0) + 1) }),
    );
  }
}

export function markNotificationIdsAsReadInCaches(queryClient: QueryClient, notificationIdList: number[]) {
  const queryEntries = queryClient.getQueriesData<InfiniteData<NotificationPageResponse>>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
  });

  queryEntries.forEach(([queryKey, data]) => {
    const filters = extractFiltersFromQueryKey(queryKey);
    const nextData = markNotificationsReadInPageData(data, notificationIdList, filters);
    if (nextData !== data) {
      queryClient.setQueryData(queryKey, nextData);
    }
  });
}

export function markAllNotificationsAsReadInCaches(queryClient: QueryClient, category?: string | null) {
  const queryEntries = queryClient.getQueriesData<InfiniteData<NotificationPageResponse>>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
  });

  queryEntries.forEach(([queryKey, data]) => {
    const filters = extractFiltersFromQueryKey(queryKey);
    const nextData = markAllNotificationsReadInPageData(data, filters, category);
    if (nextData !== data) {
      queryClient.setQueryData(queryKey, nextData);
    }
  });
}

export function useNotificationsInfiniteQuery(filters: NotificationListFilters, options: NotificationQueryOptions = {}) {
  const normalizedFilters = normalizeNotificationFilters(filters);
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, normalizedFilters],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => pageNotifications({ ...normalizedFilters, cursor: pageParam }),
    getNextPageParam: lastPage => (lastPage.isLast ? undefined : (lastPage.cursor ?? undefined)),
    refetchOnWindowFocus: false,
    enabled: options.enabled ?? true,
  });
}

export function useNotificationUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: getNotificationUnreadCount,
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationReadPayload) => markNotificationsRead(payload),
    onSuccess: async (_result, payload) => {
      markNotificationIdsAsReadInCaches(queryClient, payload.notificationIdList);
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationReadAllPayload = {}) => markAllNotificationsRead(payload),
    onSuccess: async (_result, payload) => {
      markAllNotificationsAsReadInCaches(queryClient, payload.category ?? null);
      if (!payload.category) {
        queryClient.setQueryData<NotificationUnreadCountResponse>(
          NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
          { unreadCount: 0 },
        );
      }
      else {
        await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
      }
    },
  });
}
