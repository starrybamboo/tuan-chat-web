/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 创建反馈 Issue 请求
 */
export type FeedbackIssueCreateRequest = {
    /**
     * 标题
     */
    title: string;
    /**
     * 反馈内容，支持 Markdown 图片与视频 token
     */
    content?: string;
    /**
     * 反馈类型：1-Bug，2-Prompt Request
     */
    issueType: string;
};

