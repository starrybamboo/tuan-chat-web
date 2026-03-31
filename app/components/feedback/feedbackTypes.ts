import { formatMediaContentSummary } from "@/components/common/content/mediaContent";

export const FEEDBACK_ISSUE_TARGET_TYPE = "11";

export const FEEDBACK_ISSUE_TYPE_OPTIONS = [
  {
    value: 1,
    label: "Bug反馈",
    description: "记录异常、回归或体验问题。",
  },
  {
    value: 2,
    label: "Prompt 请求",
    description: "提交提示词需求、模板建议或可复用 Prompt。",
  },
] as const;

export const FEEDBACK_ISSUE_STATUS_PENDING = 1 as const;
export const FEEDBACK_ISSUE_STATUS_PROCESSING = 2 as const;
export const FEEDBACK_ISSUE_STATUS_COMPLETED = 3 as const;
export const FEEDBACK_ISSUE_STATUS_REJECTED = 4 as const;
const FEEDBACK_ISSUE_DEVELOPER_UIDS = new Set([10001, 10003]);

export const FEEDBACK_ISSUE_STATUS_OPTIONS = [
  { value: FEEDBACK_ISSUE_STATUS_PENDING, label: "待处理" },
  { value: FEEDBACK_ISSUE_STATUS_PROCESSING, label: "处理中" },
  { value: FEEDBACK_ISSUE_STATUS_COMPLETED, label: "完成" },
  { value: FEEDBACK_ISSUE_STATUS_REJECTED, label: "拒绝" },
] as const;

export type FeedbackIssueType = (typeof FEEDBACK_ISSUE_TYPE_OPTIONS)[number]["value"];
export type FeedbackIssueStatus = (typeof FEEDBACK_ISSUE_STATUS_OPTIONS)[number]["value"];

export type FeedbackIssueContent = string;

export type FeedbackIssueAuthor = {
  userId: number;
  username: string;
  avatar?: string | null;
  avatarThumbUrl?: string | null;
};

export type FeedbackIssueListItem = {
  feedbackIssueId: number;
  title: string;
  contentPreview: string;
  issueType: FeedbackIssueType;
  status: FeedbackIssueStatus;
  archived: boolean;
  commentCount: number;
  canManage: boolean;
  author?: FeedbackIssueAuthor | null;
  createTime: string;
  updateTime: string;
};

export type FeedbackIssueDetail = {
  feedbackIssueId: number;
  title: string;
  content: string;
  issueType: FeedbackIssueType;
  status: FeedbackIssueStatus;
  archived: boolean;
  commentCount: number;
  canManage: boolean;
  author?: FeedbackIssueAuthor | null;
  createTime: string;
  updateTime: string;
};

export type FeedbackIssuePageResponse = {
  cursor?: number | null;
  isLast: boolean;
  list: FeedbackIssueListItem[];
};

export type FeedbackIssueListFilters = {
  issueType?: FeedbackIssueType;
  status?: FeedbackIssueStatus;
  archived?: boolean | null;
  mineOnly?: boolean;
  keyword?: string;
  pageSize?: number;
};

export type FeedbackIssueCreatePayload = {
  title: string;
  content: string;
  issueType: FeedbackIssueType;
};

export type FeedbackIssueStatusUpdatePayload = {
  feedbackIssueId: number;
  status: FeedbackIssueStatus;
};

export type FeedbackIssueArchiveUpdatePayload = {
  feedbackIssueId: number;
  archived: boolean;
};

export function getFeedbackIssueTypeLabel(issueType?: number | null) {
  return FEEDBACK_ISSUE_TYPE_OPTIONS.find(option => option.value === issueType)?.label ?? "未知类型";
}

export function getFeedbackIssueStatusLabel(status?: number | null) {
  return FEEDBACK_ISSUE_STATUS_OPTIONS.find(option => option.value === status)?.label ?? "未知状态";
}

export function getFeedbackIssueStatusAfterArchive(status: FeedbackIssueStatus, archived: boolean) {
  if (!archived) {
    return status;
  }

  return status === FEEDBACK_ISSUE_STATUS_COMPLETED ? status : FEEDBACK_ISSUE_STATUS_REJECTED;
}

export function isFeedbackDeveloper(userId?: number | null) {
  return typeof userId === "number" && FEEDBACK_ISSUE_DEVELOPER_UIDS.has(userId);
}

export function getFeedbackAuthorAvatar(author?: FeedbackIssueAuthor | null) {
  return author?.avatar || author?.avatarThumbUrl || "";
}

export function getFeedbackAuthorName(author?: FeedbackIssueAuthor | null) {
  return author?.username || "未知用户";
}

export function formatFeedbackDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withTimezone = /(?:[+-]\d{2}:?\d{2}|Z)$/i.test(normalized)
    ? normalized
    : `${normalized}+08:00`;
  const date = new Date(withTimezone);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFeedbackMediaSummary(content?: string | null) {
  return formatMediaContentSummary(content);
}

export function toArchiveFilterValue(archived?: boolean | null) {
  if (archived === true) {
    return "archived";
  }
  if (archived === false) {
    return "active";
  }
  return "all";
}

export function fromArchiveFilterValue(value: string): boolean | null {
  if (value === "active") {
    return false;
  }
  if (value === "archived") {
    return true;
  }
  return null;
}
