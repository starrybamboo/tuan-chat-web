/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedbackIssueAuthorResponse } from './FeedbackIssueAuthorResponse';
/**
 * 反馈 Issue 列表项
 */
export type FeedbackIssueListItemResponse = {
    /**
     * Issue ID
     */
    feedbackIssueId?: number;
    /**
     * 标题
     */
    title?: string;
    /**
     * 内容摘要
     */
    contentPreview?: string;
    /**
     * 反馈类型：1-Bug，2-Prompt Request
     */
    issueType?: string;
    /**
     * 状态：1-待处理，2-处理中，3-完成，4-拒绝
     */
    status?: string;
    /**
     * 是否归档
     */
    archived?: boolean;
    /**
     * 评论数
     */
    commentCount?: number;
    /**
     * 当前用户是否可管理
     */
    canManage?: boolean;
    author?: FeedbackIssueAuthorResponse;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

