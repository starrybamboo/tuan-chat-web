/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseFeed } from '../models/ApiResultCursorPageBaseResponseFeed';
import type { ApiResultCursorPageBaseResponseMessageFeedWithStatsResponse } from '../models/ApiResultCursorPageBaseResponseMessageFeedWithStatsResponse';
import type { ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse } from '../models/ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse';
import type { ApiResultFeedStatsResponse } from '../models/ApiResultFeedStatsResponse';
import type { ApiResultMapLongFeedStatsResponse } from '../models/ApiResultMapLongFeedStatsResponse';
import type { ApiResultMessageFeedResponse } from '../models/ApiResultMessageFeedResponse';
import type { ApiResultMessageFeedWithStatsResponse } from '../models/ApiResultMessageFeedWithStatsResponse';
import type { ApiResultMomentFeedTotalStatsResponse } from '../models/ApiResultMomentFeedTotalStatsResponse';
import type { ApiResultMomentFeedWithStatsResponse } from '../models/ApiResultMomentFeedWithStatsResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { FeedPageRequest } from '../models/FeedPageRequest';
import type { MessageFeedRequest } from '../models/MessageFeedRequest';
import type { MomentFeedRequest } from '../models/MomentFeedRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FeedControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 发布图文/聊天消息Feed
     * @param requestBody
     * @returns ApiResultMessageFeedResponse OK
     * @throws ApiError
     */
    public publishFeed(
        requestBody: MessageFeedRequest,
    ): CancelablePromise<ApiResultMessageFeedResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 删除图文/聊天消息Feed
     * @param feedId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteFeed(
        feedId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/feed',
            query: {
                'feedId': feedId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 批量获取图文/聊天消息Feed统计信息
     * @param requestBody
     * @returns ApiResultMapLongFeedStatsResponse OK
     * @throws ApiError
     */
    public batchGetFeedStats(
        requestBody: Array<number>,
    ): CancelablePromise<ApiResultMapLongFeedStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/stats/batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 分页查询图文/聊天消息Feed列表
     * 使用游标翻页
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseMessageFeedWithStatsResponse OK
     * @throws ApiError
     */
    public pageFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseMessageFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取当前用户关注者的动态Feed时间线
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getFollowingMomentFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/moment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 删除一篇动态Feed
     * @param feedId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMomentFeed(
        feedId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/feed/moment',
            query: {
                'feedId': feedId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取特定用户的动态Feed时间线
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getUserMomentFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseMomentFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/moment/user',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取动态Feed统计
     * @returns ApiResultMomentFeedTotalStatsResponse OK
     * @throws ApiError
     */
    public getMomentFeedStats(): CancelablePromise<ApiResultMomentFeedTotalStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/moment/stats',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 发布动态Feed
     * @param requestBody
     * @returns ApiResultMomentFeedWithStatsResponse OK
     * @throws ApiError
     */
    public publishMomentFeed(
        requestBody: MomentFeedRequest,
    ): CancelablePromise<ApiResultMomentFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/moment/publish',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取用户的用户活动Feed时间线
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseFeed OK
     * @throws ApiError
     */
    public getUserFeedTimeline(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeed> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/activity/user',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取图文/聊天消息Feed统计信息
     * @param feedId
     * @returns ApiResultFeedStatsResponse OK
     * @throws ApiError
     */
    public getFeedStats(
        feedId: number,
    ): CancelablePromise<ApiResultFeedStatsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/feed/stats',
            query: {
                'feedId': feedId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 根据ID获取动态Feed详情
     * @param feedId
     * @returns ApiResultMomentFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getMomentById(
        feedId: number,
    ): CancelablePromise<ApiResultMomentFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/feed/moment/detail',
            query: {
                'feedId': feedId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 根据ID获取图文/聊天消息Feed详情
     * @param feedId
     * @returns ApiResultMessageFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getFeedById(
        feedId: number,
    ): CancelablePromise<ApiResultMessageFeedWithStatsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/feed/detail',
            query: {
                'feedId': feedId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
