import type {
  FeedbackIssueArchiveUpdatePayload,
  FeedbackIssueAuthor,
  FeedbackIssueCreatePayload,
  FeedbackIssueDetail,
  FeedbackIssueListFilters,
  FeedbackIssueListItem,
  FeedbackIssuePageResponse,
  FeedbackIssueStatus,
  FeedbackIssueStatusUpdatePayload,
  FeedbackIssueType,
} from "@/components/feedback/feedbackTypes";
import type { FeedbackIssueAuthorResponse } from "api";

import {
  compactRequestBody,
  extractOpenApiErrorMessage,
  unwrapOpenApiResultData,
} from "@/utils/openApiResult";
import { avatarThumbUrl, avatarUrl } from "@/utils/mediaUrl";

import { tuanchat } from "../../../api/instance";

function normalizeFeedbackIssueCode<T extends number>(value: string | number | undefined, fallback: T) {
  const numericValue = Number(value);
  return (Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback) as T;
}

function normalizeFeedbackAuthor(author?: FeedbackIssueAuthorResponse | null): FeedbackIssueAuthor | null {
  if (!author) {
    return null;
  }

  return {
    userId: Number(author.userId ?? 0),
    username: typeof author.username === "string" && author.username.trim() ? author.username.trim() : "未知用户",
    avatar: avatarUrl(author.avatarFileId) || null,
    avatarThumbUrl: avatarThumbUrl(author.avatarFileId) || null,
  };
}

function normalizeFeedbackIssueListItem(issue: Record<string, unknown>): FeedbackIssueListItem {
  return {
    feedbackIssueId: Number(issue.feedbackIssueId ?? 0),
    title: typeof issue.title === "string" ? issue.title : "",
    contentPreview: typeof issue.contentPreview === "string" ? issue.contentPreview : "",
    issueType: normalizeFeedbackIssueCode(issue.issueType as string | number | undefined, 1 as FeedbackIssueType),
    status: normalizeFeedbackIssueCode(issue.status as string | number | undefined, 1 as FeedbackIssueStatus),
    archived: Boolean(issue.archived),
    commentCount: Number(issue.commentCount ?? 0),
    canManage: Boolean(issue.canManage),
    author: normalizeFeedbackAuthor(issue.author as FeedbackIssueAuthorResponse | null | undefined),
    createTime: typeof issue.createTime === "string" ? issue.createTime : "",
    updateTime: typeof issue.updateTime === "string" ? issue.updateTime : "",
  };
}

function normalizeFeedbackIssueDetail(issue: Record<string, unknown>): FeedbackIssueDetail {
  return {
    feedbackIssueId: Number(issue.feedbackIssueId ?? 0),
    title: typeof issue.title === "string" ? issue.title : "",
    content: typeof issue.content === "string" ? issue.content : "",
    issueType: normalizeFeedbackIssueCode(issue.issueType as string | number | undefined, 1 as FeedbackIssueType),
    status: normalizeFeedbackIssueCode(issue.status as string | number | undefined, 1 as FeedbackIssueStatus),
    archived: Boolean(issue.archived),
    commentCount: Number(issue.commentCount ?? 0),
    canManage: Boolean(issue.canManage),
    author: normalizeFeedbackAuthor(issue.author as FeedbackIssueAuthorResponse | null | undefined),
    createTime: typeof issue.createTime === "string" ? issue.createTime : "",
    updateTime: typeof issue.updateTime === "string" ? issue.updateTime : "",
  };
}

function normalizeFeedbackIssuePageResponse(payload: Record<string, unknown>): FeedbackIssuePageResponse {
  const list = Array.isArray(payload.list) ? payload.list : [];
  return {
    cursor: typeof payload.cursor === "number" ? payload.cursor : null,
    isLast: payload.isLast !== false,
    list: list.map(item => normalizeFeedbackIssueListItem((item ?? {}) as Record<string, unknown>)),
  };
}

export async function createFeedbackIssue(payload: FeedbackIssueCreatePayload) {
  try {
    const response = await tuanchat.feedbackIssueController.createIssue({
      ...payload,
      issueType: String(payload.issueType),
    });
    return normalizeFeedbackIssueDetail(
      unwrapOpenApiResultData(response, "创建反馈失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "创建反馈失败"));
  }
}

export async function pageFeedbackIssues(payload: FeedbackIssueListFilters & { cursor?: number }) {
  try {
    const response = await tuanchat.feedbackIssueController.pageIssues(compactRequestBody({
      ...payload,
      archived: payload.archived ?? undefined,
      issueType: typeof payload.issueType === "number" ? String(payload.issueType) : payload.issueType,
      status: typeof payload.status === "number" ? String(payload.status) : payload.status,
    }));
    return normalizeFeedbackIssuePageResponse(
      unwrapOpenApiResultData(response, "获取反馈列表失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "获取反馈列表失败"));
  }
}

export async function getFeedbackIssueDetail(feedbackIssueId: number) {
  try {
    const response = await tuanchat.feedbackIssueController.getIssueDetail(feedbackIssueId);
    return normalizeFeedbackIssueDetail(
      unwrapOpenApiResultData(response, "获取反馈详情失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "获取反馈详情失败"));
  }
}

export async function updateFeedbackIssueStatus(payload: FeedbackIssueStatusUpdatePayload) {
  try {
    const response = await tuanchat.feedbackIssueController.updateStatus({
      ...payload,
      status: String(payload.status),
    });
    return normalizeFeedbackIssueDetail(
      unwrapOpenApiResultData(response, "更新反馈状态失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "更新反馈状态失败"));
  }
}

export async function updateFeedbackIssueArchive(payload: FeedbackIssueArchiveUpdatePayload) {
  try {
    const response = await tuanchat.feedbackIssueController.updateArchiveStatus(payload);
    return normalizeFeedbackIssueDetail(
      unwrapOpenApiResultData(response, "更新归档状态失败"),
    );
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "更新归档状态失败"));
  }
}
