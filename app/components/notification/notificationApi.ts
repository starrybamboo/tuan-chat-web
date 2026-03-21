import type {
  NotificationPagePayload,
  NotificationPageResponse,
  NotificationReadAllPayload,
  NotificationReadPayload,
  NotificationUnreadCountResponse,
  UserNotificationItem,
  UserNotificationPayload,
} from "@/components/notification/notificationTypes";

import { tuanchat } from "../../../api/instance";
import {
  compactRequestBody,
  extractOpenApiErrorMessage,
  unwrapOpenApiResultData,
} from "@/utils/openApiResult";

function normalizeNotificationPayload(payload: unknown): UserNotificationPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as UserNotificationPayload;
}

function normalizeNotificationItem(item: Record<string, unknown>): UserNotificationItem {
  return {
    notificationId: Number(item.notificationId ?? 0),
    category: typeof item.category === "string" ? item.category : "",
    title: typeof item.title === "string" ? item.title : "",
    content: typeof item.content === "string" ? item.content : "",
    targetPath: typeof item.targetPath === "string" ? item.targetPath : "",
    resourceType: Number(item.resourceType ?? 0),
    resourceId: Number(item.resourceId ?? 0),
    isRead: Boolean(item.isRead),
    readTime: typeof item.readTime === "string" ? item.readTime : null,
    createTime: typeof item.createTime === "string" ? item.createTime : "",
    payload: normalizeNotificationPayload(item.payload),
  };
}

function normalizeNotificationPageResponse(payload: Record<string, unknown>): NotificationPageResponse {
  const list = Array.isArray(payload.list) ? payload.list : [];
  return {
    cursor: typeof payload.cursor === "number" ? payload.cursor : null,
    isLast: payload.isLast !== false,
    list: list.map(item => normalizeNotificationItem((item ?? {}) as Record<string, unknown>)),
  };
}

export async function pageNotifications(payload: NotificationPagePayload) {
  try {
    const response = await tuanchat.notificationController.pageNotifications(compactRequestBody({
      ...payload,
      category: payload.category ?? undefined,
    }));
    return normalizeNotificationPageResponse(
      unwrapOpenApiResultData(response, "获取通知列表失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "获取通知列表失败"));
  }
}

export async function getNotificationUnreadCount() {
  try {
    const response = await tuanchat.notificationController.getUnreadCount();
    const unreadCountResponse = unwrapOpenApiResultData(response, "获取未读通知数失败");
    return {
      unreadCount: Number(unreadCountResponse.unreadCount ?? 0),
    } satisfies NotificationUnreadCountResponse;
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "获取未读通知数失败"));
  }
}

export async function markNotificationsRead(payload: NotificationReadPayload) {
  try {
    const response = await tuanchat.notificationController.markRead(payload);
    return unwrapOpenApiResultData(response, "标记通知已读失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "标记通知已读失败"));
  }
}

export async function markAllNotificationsRead(payload: NotificationReadAllPayload = {}) {
  try {
    const response = await tuanchat.notificationController.markAllRead(compactRequestBody({
      ...payload,
      category: payload.category ?? undefined,
    }));
    return unwrapOpenApiResultData(response, "全部标记通知已读失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "全部标记通知已读失败"));
  }
}
