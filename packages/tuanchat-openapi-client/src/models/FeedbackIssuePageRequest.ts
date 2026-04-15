/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 反馈 Issue 列表请求
 */
export type FeedbackIssuePageRequest = {
    /**
     * 游标（上次翻页的最后一条记录的标识）
     */
    cursor?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 反馈类型：1-Bug，2-Prompt Request
     */
    issueType?: string;
    /**
     * 状态：1-待处理，2-处理中，3-完成，4-拒绝
     */
    status?: string;
    /**
     * 是否归档；为空表示不过滤
     */
    archived?: boolean;
    /**
     * 仅查看我提出的
     */
    mineOnly?: boolean;
    /**
     * 关键字（标题/内容）
     */
    keyword?: string;
};

