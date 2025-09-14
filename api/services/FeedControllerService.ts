/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseFeedWithStatsResponse } from '../models/ApiResultCursorPageBaseResponseFeedWithStatsResponse';
import type { ApiResultFeedWithStatsResponse } from '../models/ApiResultFeedWithStatsResponse';
import type { ApiResultMomentFeedTotalStatsResponse } from '../models/ApiResultMomentFeedTotalStatsResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { FeedPageRequest } from '../models/FeedPageRequest';
import type { MomentFeedRequest } from '../models/MomentFeedRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FeedControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 分页查询首页Feed列表
     * 使用游标翻页
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseFeedWithStatsResponse OK
     * @throws ApiError
     */
    public pageFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeedWithStatsResponse> {
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
     * @returns ApiResultCursorPageBaseResponseFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getFollowingMomentFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeedWithStatsResponse> {
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
     * @returns ApiResultCursorPageBaseResponseFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getUserMomentFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeedWithStatsResponse> {
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
     * @param userId
     * @returns ApiResultMomentFeedTotalStatsResponse OK
     * @throws ApiError
     */
    public getMomentFeedStats(
        userId: number,
    ): CancelablePromise<ApiResultMomentFeedTotalStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/feed/moment/stats',
            query: {
                'userId': userId,
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
     * 发布动态Feed
     * @param requestBody
     * @returns ApiResultFeedWithStatsResponse OK
     * @throws ApiError
     */
    public publishMomentFeed(
        requestBody: MomentFeedRequest,
    ): CancelablePromise<ApiResultFeedWithStatsResponse> {
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
     * 根据ID获取动态Feed详情
     * @param feedId
     * @returns ApiResultFeedWithStatsResponse OK
     * @throws ApiError
     */
    public getMomentById(
        feedId: number,
    ): CancelablePromise<ApiResultFeedWithStatsResponse> {
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
}
