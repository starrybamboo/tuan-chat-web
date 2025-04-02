/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChatMessagePageRequest = {
    /**
     * 页面大小
     */
    pageSize?: number;
    /**
     * 游标（初始为null，后续请求附带上次翻页的游标）
     */
    cursor?: number;
    /**
     * 会话id
     */
    roomId: number;
};

