/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MomentFeedWithStatsResponse } from './MomentFeedWithStatsResponse';
/**
 * 游标翻页返回
 */
export type CursorPageBaseResponseMomentFeedWithStatsResponse = {
    /**
     * 游标（下次翻页带上这参数）
     */
    cursor?: number;
    /**
     * 是否最后一页
     */
    isLast?: boolean;
    /**
     * 数据列表
     */
    list?: Array<MomentFeedWithStatsResponse>;
};

