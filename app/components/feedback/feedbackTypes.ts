export const FEEDBACK_ISSUE_TARGET_TYPE = "11";

export const FEEDBACK_ISSUE_TYPE_OPTIONS = [
  {
    value: 1,
    label: "Bug反馈",
    description: "记录异常、回归、兼容性或体验问题。",
  },
  {
    value: 2,
    label: "Prompt Request",
    description: "提交提示词需求、模板建议或可复用 Prompt。",
  },
] as const;

export const FEEDBACK_ISSUE_STATUS_OPTIONS = [
  { value: 1, label: "待处理" },
  { value: 2, label: "处理中" },
  { value: 3, label: "已关闭" },
] as const;

export type FeedbackIssueType = (typeof FEEDBACK_ISSUE_TYPE_OPTIONS)[number]["value"];
export type FeedbackIssueStatus = (typeof FEEDBACK_ISSUE_STATUS_OPTIONS)[number]["value"];

export interface FeedbackIssueAuthor {
  userId: number;
  username: string;
  avatar?: string | null;
  avatarThumbUrl?: string | null;
}

export interface FeedbackIssueListItem {
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
}

export interface FeedbackIssueDetail {
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
}

export interface FeedbackIssuePageResponse {
  cursor?: number | null;
  isLast: boolean;
  list: FeedbackIssueListItem[];
}

export interface FeedbackIssueListFilters {
  issueType?: FeedbackIssueType;
  status?: FeedbackIssueStatus;
  archived?: boolean | null;
  mineOnly?: boolean;
  keyword?: string;
  pageSize?: number;
}

export interface FeedbackIssueCreatePayload {
  title: string;
  content: string;
  issueType: FeedbackIssueType;
}

export interface FeedbackIssueStatusUpdatePayload {
  feedbackIssueId: number;
  status: FeedbackIssueStatus;
}

export interface FeedbackIssueArchiveUpdatePayload {
  feedbackIssueId: number;
  archived: boolean;
}

export function getFeedbackIssueTypeLabel(issueType?: number | null) {
  return FEEDBACK_ISSUE_TYPE_OPTIONS.find(option => option.value === issueType)?.label ?? "未知类型";
}

export function getFeedbackIssueStatusLabel(status?: number | null) {
  return FEEDBACK_ISSUE_STATUS_OPTIONS.find(option => option.value === status)?.label ?? "未知状态";
}

export function getFeedbackIssueTypeBadgeClass(issueType?: number | null) {
  if (issueType === 1) {
    return "badge-error";
  }
  if (issueType === 2) {
    return "badge-info";
  }
  return "badge-ghost";
}

export function getFeedbackIssueStatusBadgeClass(status?: number | null) {
  if (status === 1) {
    return "badge-warning";
  }
  if (status === 2) {
    return "badge-primary";
  }
  if (status === 3) {
    return "badge-success";
  }
  return "badge-ghost";
}

export function getFeedbackAuthorAvatar(author?: FeedbackIssueAuthor | null) {
  return author?.avatarThumbUrl || author?.avatar || "";
}

export function getFeedbackAuthorName(author?: FeedbackIssueAuthor | null) {
  return author?.username || "未知用户";
}

export function formatFeedbackDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withTimezone = /([+-]\d{2}:?\d{2}|Z)$/i.test(normalized)
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
