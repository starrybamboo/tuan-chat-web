import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseNotificationItemResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";
import type { NotificationPageRequest } from "@tuanchat/openapi-client/models/NotificationPageRequest";
import type { NotificationReadAllRequest } from "@tuanchat/openapi-client/models/NotificationReadAllRequest";
import type { NotificationReadRequest } from "@tuanchat/openapi-client/models/NotificationReadRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type NotificationClient = Pick<TuanChat, "notificationController">;
type NotificationPageData = InfiniteData<ApiResultCursorPageBaseResponseNotificationItemResponse, number | undefined>;

export function getNotificationsQueryKey(filters: NotificationPageRequest = {}) {
  return ["notifications", filters] as const;
}

export function getNotificationsUnreadCountQueryKey() {
  return ["notificationsUnreadCount"] as const;
}

function getNotificationId(item: NotificationItemResponse): number | null {
  return typeof item.notificationId === "number" && Number.isFinite(item.notificationId)
    ? item.notificationId
    : null;
}

function notificationMatchesFilters(item: NotificationItemResponse, filters: NotificationPageRequest): boolean {
  if ((filters as { unreadOnly?: boolean }).unreadOnly && item.isRead) {
    return false;
  }
  if (filters.category && item.category !== filters.category) {
    return false;
  }
  return true;
}

export function prependNotificationToPageData(
  data: NotificationPageData | undefined,
  item: NotificationItemResponse,
  filters: NotificationPageRequest = {},
): NotificationPageData | undefined {
  const notificationId = getNotificationId(item);
  if (!data || notificationId == null || !notificationMatchesFilters(item, filters)) {
    return data;
  }
  const pageSize = filters.pageSize ?? 20;
  const pages = data.pages.map((page, index) => {
    const list = page.data?.list ?? [];
    const withoutDuplicate = list.filter(existing => existing.notificationId !== notificationId);
    const nextList = index === 0
      ? [item, ...withoutDuplicate].slice(0, pageSize)
      : withoutDuplicate;
    return {
      ...page,
      data: {
        ...page.data,
        list: nextList,
      },
    };
  });

  return {
    ...data,
    pages,
  };
}

export function markNotificationsReadInPageData(
  data: NotificationPageData | undefined,
  notificationIdList: number[],
  filters: NotificationPageRequest = {},
): NotificationPageData | undefined {
  if (!data || notificationIdList.length === 0) {
    return data;
  }
  const idSet = new Set(notificationIdList);
  return {
    ...data,
    pages: data.pages.map((page) => {
      const list = page.data?.list ?? [];
      const nextList = (filters as { unreadOnly?: boolean }).unreadOnly
        ? list.filter(item => !idSet.has(item.notificationId ?? -1))
        : list.map(item => idSet.has(item.notificationId ?? -1) ? { ...item, isRead: true } : item);
      return {
        ...page,
        data: {
          ...page.data,
          list: nextList,
        },
      };
    }),
  };
}

export function markAllNotificationsReadInPageData(
  data: NotificationPageData | undefined,
  filters: NotificationPageRequest = {},
  category?: string | null,
): NotificationPageData | undefined {
  if (!data) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page) => {
      const list = page.data?.list ?? [];
      const nextList = (filters as { unreadOnly?: boolean }).unreadOnly
        ? list.filter(item => category && item.category !== category)
        : list.map(item => (!category || item.category === category) ? { ...item, isRead: true } : item);
      return {
        ...page,
        data: {
          ...page.data,
          list: nextList,
        },
      };
    }),
  };
}

export function prependNotificationToCaches(queryClient: QueryClient, item: NotificationItemResponse) {
  const queryEntries = queryClient.getQueriesData<NotificationPageData>({ queryKey: ["notifications"] });
  const notificationId = getNotificationId(item);
  const known = notificationId != null
    && queryEntries.some(([, data]) => data?.pages.some(page => (page.data?.list ?? []).some(existing => existing.notificationId === notificationId)));
  for (const [queryKey, data] of queryEntries) {
    const filters = (queryKey[1] ?? {}) as NotificationPageRequest;
    queryClient.setQueryData(queryKey, prependNotificationToPageData(data, item, filters));
  }
  if (!known && !item.isRead) {
    queryClient.setQueryData<{ unreadCount?: number }>(
      getNotificationsUnreadCountQueryKey(),
      current => ({ unreadCount: (current?.unreadCount ?? 0) + 1 }),
    );
  }
}

export function useNotificationsInfiniteQuery(
  client: NotificationClient,
  filters: NotificationPageRequest = {},
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const pageSize = filters.pageSize ?? 20;
  return useInfiniteQuery({
    enabled: options.enabled ?? true,
    queryKey: getNotificationsQueryKey({ ...filters, pageSize }),
    queryFn: ({ pageParam }) => client.notificationController.pageNotifications({
      ...filters,
      pageSize,
      cursor: pageParam,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.isLast) {
        return undefined;
      }
      return typeof lastPage.data.cursor === "number" ? lastPage.data.cursor : undefined;
    },
    staleTime: options.staleTime ?? 30_000,
  });
}

export function useNotificationUnreadCountQuery(
  client: NotificationClient,
  enabled = true,
) {
  return useQuery({
    enabled,
    queryFn: () => client.notificationController.getUnreadCount(),
    queryKey: getNotificationsUnreadCountQueryKey(),
    staleTime: 15_000,
  });
}

export function useMarkNotificationsReadMutation(client: NotificationClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationReadRequest) => client.notificationController.markRead(payload),
    onSuccess: (_result, payload) => {
      const ids = payload.notificationIdList ?? [];
      for (const [queryKey, data] of queryClient.getQueriesData<NotificationPageData>({ queryKey: ["notifications"] })) {
        queryClient.setQueryData(queryKey, markNotificationsReadInPageData(data, ids, (queryKey[1] ?? {}) as NotificationPageRequest));
      }
      queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() });
    },
  });
}

export function useMarkAllNotificationsReadMutation(client: NotificationClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationReadAllRequest = {}) => client.notificationController.markAllRead(payload),
    onSuccess: (_result, payload) => {
      for (const [queryKey, data] of queryClient.getQueriesData<NotificationPageData>({ queryKey: ["notifications"] })) {
        queryClient.setQueryData(queryKey, markAllNotificationsReadInPageData(data, (queryKey[1] ?? {}) as NotificationPageRequest, payload.category ?? null));
      }
      if (payload.category) {
        queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() });
      }
      else {
        queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), { unreadCount: 0 });
      }
    },
  });
}
