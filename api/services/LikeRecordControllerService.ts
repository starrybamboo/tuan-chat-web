/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultListLikeStatusResp } from '../models/ApiResultListLikeStatusResp';
import type { ApiResultMapLongInteger } from '../models/ApiResultMapLongInteger';
import type { ApiResultPageBaseRespLikeRecord } from '../models/ApiResultPageBaseRespLikeRecord';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BatchLikeRecordRequest } from '../models/BatchLikeRecordRequest';
import type { LikeCountRequest } from '../models/LikeCountRequest';
import type { LikeRecordRequest } from '../models/LikeRecordRequest';
import type { PageBaseRequest } from '../models/PageBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class LikeRecordControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 查询是否点赞过
     * @param targetId
     * @param targetType
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public isLiked(
        targetId: number,
        targetType: string,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/like',
            query: {
                'targetId': targetId,
                'targetType': targetType,
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
     * 点赞
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public like(
        requestBody: LikeRecordRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/like',
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
     * 取消点赞
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public unlike(
        requestBody: LikeRecordRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/like',
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
     * 获取用户点赞的内容
     * @param requestBody
     * @returns ApiResultPageBaseRespLikeRecord OK
     * @throws ApiError
     */
    public getUserLikedPage(
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespLikeRecord> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/like/user/page',
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
     * 批量获取点赞数量
     * @param requestBody
     * @returns ApiResultMapLongInteger OK
     * @throws ApiError
     */
    public batchGetLikeCount(
        requestBody: LikeCountRequest,
    ): CancelablePromise<ApiResultMapLongInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/like/count/batch',
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
     * 批量查询是否点赞过
     * @param requestBody
     * @returns ApiResultListLikeStatusResp OK
     * @throws ApiError
     */
    public batchIsLiked(
        requestBody: BatchLikeRecordRequest,
    ): CancelablePromise<ApiResultListLikeStatusResp> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/like/batch',
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
     * 获取点赞数量
     * @param targetId
     * @param targetType
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getLikeCount(
        targetId: number,
        targetType: string,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/like/count',
            query: {
                'targetId': targetId,
                'targetType': targetType,
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
