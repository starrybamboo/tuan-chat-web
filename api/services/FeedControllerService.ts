/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseFeed } from '../models/ApiResultCursorPageBaseResponseFeed';
import type { ApiResultFeed } from '../models/ApiResultFeed';
import type { ApiResultMapStringInteger } from '../models/ApiResultMapStringInteger';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { FeedPageRequest } from '../models/FeedPageRequest';
import type { FeedRequest } from '../models/FeedRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FeedControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据ID获取Feed
     * @param feedId
     * @returns ApiResultFeed OK
     * @throws ApiError
     */
    public getFeedById(
        feedId: number,
    ): CancelablePromise<ApiResultFeed> {
        return this.httpRequest.request({
            method: 'GET',
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
     * 修改Feed
     * @param requestBody
     * @returns ApiResultFeed OK
     * @throws ApiError
     */
    public updateFeed(
        requestBody: FeedRequest,
    ): CancelablePromise<ApiResultFeed> {
        return this.httpRequest.request({
            method: 'PUT',
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
     * 发布Feed
     * @param requestBody
     * @returns ApiResultFeed OK
     * @throws ApiError
     */
    public publishFeed(
        requestBody: FeedRequest,
    ): CancelablePromise<ApiResultFeed> {
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
     * 删除Feed
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
     * 分页查询Feed列表
     * 使用游标翻页
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseFeed OK
     * @throws ApiError
     */
    public pageFeed(
        requestBody: FeedPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeed> {
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
     * 获取Feed统计信息
     * 获取指定Feed的点赞数、评论数和收藏数
     * @param feedId
     * @returns ApiResultMapStringInteger OK
     * @throws ApiError
     */
    public getFeedStats(
        feedId: number,
    ): CancelablePromise<ApiResultMapStringInteger> {
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
}
