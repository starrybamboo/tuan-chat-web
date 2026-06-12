import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import type {
  NotificationListFilters,
  NotificationPageResponse,
  NotificationReadAllPayload,
  NotificationReadPayload,
  NotificationUnreadCountResponse,
  UserNotificationItem,
} from "@/components/notification/notificationTypes";
import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseNotificationItemResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import {
  prependNotificationToCaches as prependSharedNotificationToCaches,
  useMarkAllNotificationsReadMutation as useSharedMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation as useSharedMarkNotificationsReadMutation,
  useNotificationsInfiniteQuery as useSharedNotificationsInfiniteQuery,
  useNotificationUnreadCountQuery as useSharedNotificationUnreadCountQuery,
} from "@tuanchat/query/notifications";

import { tuanchat } from "../../../api/instance";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ["notificationsUnreadCount"] as const;

type NotificationQueryOptions = {
  enabled?: boolean;
};

type SharedNotificationPageData = InfiniteData<ApiResultCursorPageBaseResponseNotificationItemResponse, unknown>;

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

function toWebNotificationItem(item: NotificationItemResponse): UserNotificationItem {
  return {
    notificationId: Number(item.notificationId ?? 0),
    category: item.category ?? "",
    title: item.title ?? "",
    content: item.content ?? "",
    targetPath: item.targetPath ?? "",
    resourceType: Number(item.resourceType ?? 0),
    resourceId: Number(item.resourceId ?? 0),
    isRead: Boolean(item.isRead),
    readTime: item.readTime ?? null,
    createTime: item.createTime ?? "",
    payload: item.payload && typeof item.payload === "object" ? item.payload as UserNotificationItem["payload"] : null,
  };
}

function toSharedNotificationItem(item: UserNotificationItem): NotificationItemResponse {
  return {
    notificationId: item.notificationId,
    category: item.category,
    title: item.title,
    content: item.content,
    targetPath: item.targetPath,
    resourceType: String(item.resourceType),
    resourceId: item.resourceId,
    isRead: item.isRead,
    readTime: item.readTime ?? undefined,
    createTime: item.createTime,
    payload: item.payload as NotificationItemResponse["payload"],
  };
}

function toWebNotificationPageData(
  data: SharedNotificationPageData | undefined,
): InfiniteData<NotificationPageResponse, unknown> | undefined {
  if (!data) {
    return undefined;
  }

  return {
    ...data,
    pages: data.pages.map(page => ({
      cursor: page.data?.cursor ?? null,
      isLast: page.data?.isLast ?? true,
      list: (page.data?.list ?? []).map(toWebNotificationItem),
    })),
  };
}

function isSharedNotificationPageData(data: unknown): data is SharedNotificationPageData {
  const firstPage = (data as { pages?: unknown[] } | undefined)?.pages?.[0];
  return Boolean(firstPage && typeof firstPage === "object" && "data" in firstPage);
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
  const sharedItem = toSharedNotificationItem(item);
  const sharedQueryEntries = queryClient.getQueriesData<SharedNotificationPageData>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
  });

  const hasSharedCache = sharedQueryEntries.some(([, data]) => isSharedNotificationPageData(data));
  if (hasSharedCache) {
    prependSharedNotificationToCaches(queryClient, sharedItem);
    return;
  }

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
