/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCommunityResponse } from '../models/ApiResultCommunityResponse';
import type { ApiResultListCommunityResponse } from '../models/ApiResultListCommunityResponse';
import type { CommunityCreateRequest } from '../models/CommunityCreateRequest';
import type { CommunityUpdateRequest } from '../models/CommunityUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommunityService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Update community
     * 更新社区信息
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public updateCommunity(
        requestBody: CommunityUpdateRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/community/update',
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
     * Get community info
     * 获取社区信息
     * @param requestBody
     * @returns ApiResultCommunityResponse OK
     * @throws ApiError
     */
    public getCommunityInfo(
        requestBody: number,
    ): CancelablePromise<ApiResultCommunityResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/community/info',
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
     * Enable community
     * 启用社区
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public enableCommunity(
        requestBody: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/community/enable',
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
     * Disable community
     * 禁用社区
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public disableCommunity(
        requestBody: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/community/disable',
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
     * Create community
     * 创建社区
     * @param requestBody
     * @returns ApiResultCommunityResponse OK
     * @throws ApiError
     */
    public createCommunity(
        requestBody: CommunityCreateRequest,
    ): CancelablePromise<ApiResultCommunityResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/community/create',
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
     * List communities
     * 获取社区列表
     * @returns ApiResultListCommunityResponse OK
     * @throws ApiError
     */
    public listCommunities(): CancelablePromise<ApiResultListCommunityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/community/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
