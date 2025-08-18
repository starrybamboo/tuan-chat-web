/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Feed分页请求
 */
export type FeedPageRequest = {
    /**
     * 游标（上次翻页的最后一条记录的标识）
     */
    cursor?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 用户ID，用于查询特定用户的用户活动timeline时间线/特定用户动态列表时使用, 可选
     */
    userId?: number;
};

