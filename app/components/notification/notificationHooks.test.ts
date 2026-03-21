import type { InfiniteData } from "@tanstack/react-query";

import { describe, expect, it } from "vitest";

import type { NotificationPageResponse, UserNotificationItem } from "@/components/notification/notificationTypes";

import {
  markAllNotificationsReadInPageData,
  markNotificationsReadInPageData,
  prependNotificationToPageData,
} from "@/components/notification/notificationHooks";

function createNotification(notificationId: number, overrides: Partial<UserNotificationItem> = {}): UserNotificationItem {
  return {
    notificationId,
    category: "FEEDBACK_STATUS_CHANGED",
    title: `通知 ${notificationId}`,
    content: `内容 ${notificationId}`,
    targetPath: `/feedback/${notificationId}`,
    resourceType: 11,
    resourceId: notificationId,
    isRead: false,
    readTime: null,
    createTime: `2026-03-15 10:0${notificationId}:00`,
    payload: {
      feedbackIssueId: notificationId,
    },
    ...overrides,
  };
}

function createPageData(): InfiniteData<NotificationPageResponse> {
  return {
    pageParams: [undefined],
    pages: [
      {
        cursor: 1001,
        isLast: false,
        list: [
          createNotification(1001),
          createNotification(1000, { isRead: true, readTime: "2026-03-15 09:00:00" }),
        ],
      },
    ],
  };
}

function createMultiPageData(): InfiniteData<NotificationPageResponse> {
  return {
    pageParams: [undefined, 998],
    pages: [
      {
        cursor: 1000,
        isLast: false,
        list: [
          createNotification(1001),
          createNotification(1000, { isRead: true, readTime: "2026-03-15 09:00:00" }),
        ],
      },
      {
        cursor: 998,
        isLast: true,
        list: [
          createNotification(999),
          createNotification(998, { category: "FEEDBACK_COMMENT_ADDED" }),
        ],
      },
    ],
  };
}

describe("notificationHooks", () => {
  it("会把新的未读通知插入到第一页头部", () => {
    const data = createPageData();
    const next = prependNotificationToPageData(data, createNotification(1002), { pageSize: 20 });

    expect(next).not.toBe(data);
    expect(next?.pages[0].list.map(item => item.notificationId)).toEqual([1002, 1001, 1000]);
    expect(data.pages[0].list.map(item => item.notificationId)).toEqual([1001, 1000]);
  });

  it("在未读过滤视图中标记已读时会移除对应通知", () => {
    const data = createPageData();
    const next = markNotificationsReadInPageData(data, [1001], { unreadOnly: true }, "2026-03-15 11:00:00");

    expect(next?.pages[0].list.map(item => item.notificationId)).toEqual([1000]);
  });

  it("在全部视图中标记已读时会保留通知并更新已读状态", () => {
    const data = createPageData();
    const next = markNotificationsReadInPageData(data, [1001], {}, "2026-03-15 11:00:00");

    expect(next?.pages[0].list[0]).toMatchObject({
      notificationId: 1001,
      isRead: true,
      readTime: "2026-03-15 11:00:00",
    });
    expect(data.pages[0].list[0]).toMatchObject({
      notificationId: 1001,
      isRead: false,
      readTime: null,
    });
  });

  it("标记单页通知已读时不会误重建未变化的其他页", () => {
    const data = createMultiPageData();
    const next = markNotificationsReadInPageData(data, [1001], {}, "2026-03-15 11:00:00");

    expect(next).not.toBe(data);
    expect(next?.pages[0]).not.toBe(data.pages[0]);
    expect(next?.pages[1]).toBe(data.pages[1]);
  });

  it("分类全部已读时不会误重建未变化的其他页", () => {
    const data = createMultiPageData();
    const next = markAllNotificationsReadInPageData(
      data,
      {},
      "FEEDBACK_COMMENT_ADDED",
      "2026-03-15 12:00:00",
    );

    expect(next).not.toBe(data);
    expect(next?.pages[0]).toBe(data.pages[0]);
    expect(next?.pages[1]).not.toBe(data.pages[1]);
    expect(next?.pages[1].list[1]).toMatchObject({
      notificationId: 998,
      isRead: true,
      readTime: "2026-03-15 12:00:00",
    });
  });
});
