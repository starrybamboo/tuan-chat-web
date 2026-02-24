/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultListMarkStatusResp } from '../models/ApiResultListMarkStatusResp';
import type { ApiResultMapLongInteger } from '../models/ApiResultMapLongInteger';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BatchMarkStatusRequest } from '../models/BatchMarkStatusRequest';
import type { MarkCountRequest } from '../models/MarkCountRequest';
import type { MarkRecordRequest } from '../models/MarkRecordRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MarkControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 查询是否已标记
     * @param targetId
     * @param targetType
     * @param markType
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public isMarked(
        targetId: number,
        targetType: string,
        markType: string,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marks',
            query: {
                'targetId': targetId,
                'targetType': targetType,
                'markType': markType,
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
     * 添加标记
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public mark(
        requestBody: MarkRecordRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marks',
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
     * 取消标记
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public unmark(
        requestBody: MarkRecordRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/marks',
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
     * 批量获取标记数量
     * @param requestBody
     * @returns ApiResultMapLongInteger OK
     * @throws ApiError
     */
    public batchGetMarkCount(
        requestBody: MarkCountRequest,
    ): CancelablePromise<ApiResultMapLongInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marks/count/batch',
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
     * 批量查询标记状态
     * @param requestBody
     * @returns ApiResultListMarkStatusResp OK
     * @throws ApiError
     */
    public batchIsMarked(
        requestBody: BatchMarkStatusRequest,
    ): CancelablePromise<ApiResultListMarkStatusResp> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marks/batch',
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
     * 获取标记数量
     * @param targetId
     * @param targetType
     * @param markType
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getMarkCount(
        targetId: number,
        targetType: string,
        markType: string,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marks/count',
            query: {
                'targetId': targetId,
                'targetType': targetType,
                'markType': markType,
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
