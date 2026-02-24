/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type BlocksuiteDocUpdatesResponse = {
    /**
     * 增量更新列表（按serverTime升序）
     */
    updates?: Array<string>;
    /**
     * 最新serverTime(ms)，用于下一次拉取游标
     */
    latestServerTime?: number;
};

