import type { InfiniteData } from "@tanstack/react-query";
import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseNotificationItemResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  getNotificationsQueryKey,
  getNotificationsUnreadCountQueryKey,
  invalidateNotificationQueries,
  markAllNotificationsReadInCaches,
  markAllNotificationsReadInPageData,
  markNotificationsReadInCaches,
  markNotificationsReadInPageData,
  prependNotificationToCaches,
  prependNotificationToPageData,
} from "./notifications";

type NotificationData = InfiniteData<ApiResultCursorPageBaseResponseNotificationItemResponse, number | undefined>;

function notification(notificationId: number, overrides: Partial<NotificationItemResponse> = {}): NotificationItemResponse {
  return {
    category: "SYSTEM",
    content: `content-${notificationId}`,
    isRead: false,
    notificationId,
    title: `title-${notificationId}`,
    ...overrides,
  };
}

function pageData(items: NotificationItemResponse[]): NotificationData {
  return {
    pageParams: [undefined],
    pages: [{
      success: true,
      data: {
        isLast: true,
        list: items,
      },
    }],
  };
}

function unreadCountData(unreadCount: number) {
  return {
    success: true,
    data: { unreadCount },
  };
}

describe("notification cache helpers", () => {
  it("把推送通知插入第一页并去重", () => {
    const data = pageData([notification(1), notification(2)]);

    expect(prependNotificationToPageData(data, notification(2, { title: "updated" }))?.pages[0].data?.list).toEqual([
      notification(2, { title: "updated" }),
      notification(1),
    ]);
  });

  it("标记单条已读，未读过滤视图会移除该项", () => {
    const data = pageData([notification(1), notification(2)]);

    expect(markNotificationsReadInPageData(data, [1])?.pages[0].data?.list[0].isRead).toBe(true);
    expect(markNotificationsReadInPageData(data, [1], { unreadOnly: true } as any)?.pages[0].data?.list).toEqual([
      notification(2),
    ]);
  });

  it("全部已读支持按 category 过滤", () => {
    const data = pageData([
      notification(1, { category: "A" }),
      notification(2, { category: "B" }),
    ]);

    expect(markAllNotificationsReadInPageData(data, {}, "A")?.pages[0].data?.list).toEqual([
      notification(1, { category: "A", isRead: true }),
      notification(2, { category: "B" }),
    ]);
  });

  it("批量全部已读会同步页面缓存和未读数缓存", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([
      notification(1),
      notification(2),
    ]));
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20, unreadOnly: true } as any), pageData([
      notification(1),
      notification(2),
    ]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), unreadCountData(2));

    markAllNotificationsReadInCaches(queryClient, {});

    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20 }))?.pages[0].data?.list.map(item => item.isRead)).toEqual([true, true]);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20, unreadOnly: true } as any))?.pages[0].data?.list).toEqual([]);
    expect(queryClient.getQueryData<ReturnType<typeof unreadCountData>>(getNotificationsUnreadCountQueryKey())?.data?.unreadCount).toBe(0);
  });

  it("推送缓存遇到已存在通知时不重复增加未读数", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([notification(1)]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), unreadCountData(3));

    prependNotificationToCaches(queryClient, notification(1, { title: "updated" }));

    expect(queryClient.getQueryData<ReturnType<typeof unreadCountData>>(getNotificationsUnreadCountQueryKey())?.data?.unreadCount).toBe(3);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20 }))?.pages[0].data?.list[0].title).toBe("updated");
  });

  it("推送新未读通知会用 OpenAPI 返回形状增加未读数", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([notification(1)]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), unreadCountData(3));

    prependNotificationToCaches(queryClient, notification(2));

    expect(queryClient.getQueryData<ReturnType<typeof unreadCountData>>(getNotificationsUnreadCountQueryKey())?.data?.unreadCount).toBe(4);
  });

  it("标记已读后只按缓存中确认的未读通知扣减未读数并夹到零", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([
      notification(1),
      notification(2),
      notification(3, { isRead: true }),
    ]));
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20, unreadOnly: true } as any), pageData([
      notification(1),
      notification(2),
    ]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), unreadCountData(1));

    markNotificationsReadInCaches(queryClient, [1, 2, 3]);

    expect(queryClient.getQueryData<ReturnType<typeof unreadCountData>>(getNotificationsUnreadCountQueryKey())?.data?.unreadCount).toBe(0);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20 }))?.pages[0].data?.list.map(item => item.isRead)).toEqual([true, true, true]);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20, unreadOnly: true } as any))?.pages[0].data?.list).toEqual([]);
  });

  it("重复标记同一批通知已读不会重复扣减未读数", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([
      notification(1),
      notification(2),
    ]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), unreadCountData(2));

    markNotificationsReadInCaches(queryClient, [1, 2]);
    markNotificationsReadInCaches(queryClient, [1, 2]);

    expect(queryClient.getQueryData<ReturnType<typeof unreadCountData>>(getNotificationsUnreadCountQueryKey())?.data?.unreadCount).toBe(0);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20 }))?.pages[0].data?.list.map(item => item.isRead)).toEqual([true, true]);
  });

  it("失效通知查询时会同时校准列表和未读数", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    invalidateNotificationQueries(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["notifications"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getNotificationsUnreadCountQueryKey() });
  });
});
