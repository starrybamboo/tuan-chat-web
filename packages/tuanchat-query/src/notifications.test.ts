import { describe, expect, it } from "vitest";

import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseNotificationItemResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import {
  getNotificationsQueryKey,
  getNotificationsUnreadCountQueryKey,
  markAllNotificationsReadInPageData,
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

  it("推送缓存遇到已存在通知时不重复增加未读数", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getNotificationsQueryKey({ pageSize: 20 }), pageData([notification(1)]));
    queryClient.setQueryData(getNotificationsUnreadCountQueryKey(), { unreadCount: 3 });

    prependNotificationToCaches(queryClient, notification(1, { title: "updated" }));

    expect(queryClient.getQueryData<{ unreadCount?: number }>(getNotificationsUnreadCountQueryKey())?.unreadCount).toBe(3);
    expect(queryClient.getQueryData<NotificationData>(getNotificationsQueryKey({ pageSize: 20 }))?.pages[0].data?.list[0].title).toBe("updated");
  });
});
