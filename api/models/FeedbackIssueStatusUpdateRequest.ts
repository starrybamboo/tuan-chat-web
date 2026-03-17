/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 更新反馈 Issue 状态请求
 */
export type FeedbackIssueStatusUpdateRequest = {
    /**
     * Issue ID
     */
    feedbackIssueId: number;
    /**
     * 状态：1-待处理，2-处理中，3-完成，4-拒绝
     */
    status: string;
};

