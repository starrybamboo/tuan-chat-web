import { formatTimeSmartly } from "@/utils/dateUtil";

const NOTIFICATION_CATEGORY_FEEDBACK_ISSUE_CREATED = "FEEDBACK_ISSUE_CREATED" as const;
const NOTIFICATION_CATEGORY_FEEDBACK_STATUS_CHANGED = "FEEDBACK_STATUS_CHANGED" as const;
const NOTIFICATION_CATEGORY_FEEDBACK_ARCHIVED = "FEEDBACK_ARCHIVED" as const;
const NOTIFICATION_CATEGORY_FEEDBACK_COMMENT_ADDED = "FEEDBACK_COMMENT_ADDED" as const;
const NOTIFICATION_CATEGORY_FEEDBACK_COMMENT_REPLIED = "FEEDBACK_COMMENT_REPLIED" as const;

export type NotificationCategory
  = | typeof NOTIFICATION_CATEGORY_FEEDBACK_ISSUE_CREATED
    | typeof NOTIFICATION_CATEGORY_FEEDBACK_STATUS_CHANGED
    | typeof NOTIFICATION_CATEGORY_FEEDBACK_ARCHIVED
    | typeof NOTIFICATION_CATEGORY_FEEDBACK_COMMENT_ADDED
    | typeof NOTIFICATION_CATEGORY_FEEDBACK_COMMENT_REPLIED;

export type UserNotificationPayload = {
  feedbackIssueId?: number;
  feedbackTitle?: string;
  status?: number;
  archived?: boolean;
  commentId?: number;
  commentPreview?: string;
  operatorName?: string;
  [key: string]: unknown;
};

export type UserNotificationItem = {
  notificationId: number;
  category: NotificationCategory | string;
  title: string;
  content: string;
  targetPath: string;
  resourceType: number;
  resourceId: number;
  isRead: boolean;
  readTime?: string | null;
  createTime: string;
  payload?: UserNotificationPayload | null;
};

export type NotificationPageResponse = {
  cursor?: number | null;
  isLast: boolean;
  list: UserNotificationItem[];
};

export type NotificationListFilters = {
  unreadOnly?: boolean;
  category?: NotificationCategory | string | null;
  pageSize?: number;
};

export type NotificationPagePayload = NotificationListFilters & {
  cursor?: number;
};

export type NotificationReadPayload = {
  notificationIdList: number[];
};

export type NotificationReadAllPayload = {
  category?: NotificationCategory | string | null;
};

export type NotificationUnreadCountResponse = {
  unreadCount: number;
};

export function formatNotificationTime(value?: string | null) {
  if (!value) {
    return "";
  }
  return formatTimeSmartly(value);
}
