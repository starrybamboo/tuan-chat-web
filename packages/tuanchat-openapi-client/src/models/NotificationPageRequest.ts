/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 通知分页请求
 */
export type NotificationPageRequest = {
    /**
     * 游标（上次翻页的最后一条记录的标识）
     */
    cursor?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 是否仅看未读
     */
    unreadOnly?: boolean;
    /**
     * 通知分类
     */
    category?: string;
};

