/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedStatsResponse } from './FeedStatsResponse';
import type { MessageFeedResponse } from './MessageFeedResponse';
/**
 * 转发消息Feed详情响应（包含统计信息）
 */
export type MessageFeedWithStatsResponse = {
    feed?: MessageFeedResponse;
    stats?: FeedStatsResponse;
};

