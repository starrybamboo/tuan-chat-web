/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMapLongInteger } from '../models/ApiResultMapLongInteger';
import type { ApiResultMapStringInteger } from '../models/ApiResultMapStringInteger';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BatchCounterQueryDTO } from '../models/BatchCounterQueryDTO';
import type { CounterOperationDTO } from '../models/CounterOperationDTO';
import type { UVOperationDTO } from '../models/UVOperationDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CounterService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 记录用户访问
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public recordUniqueVisit(
        requestBody: UVOperationDTO,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/counter/uv/record',
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
     * 手动触发同步到数据库
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public syncToDatabase(): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/counter/sync',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 设置计数
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public setCounter(
        requestBody: CounterOperationDTO,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/counter/set',
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
     * 增加计数
     * @param requestBody
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public incrCounter(
        requestBody: CounterOperationDTO,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/counter/incr',
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
     * 批量获取计数
     * @param requestBody
     * @returns ApiResultMapLongInteger OK
     * @throws ApiError
     */
    public batchGetCounter(
        requestBody: BatchCounterQueryDTO,
    ): CancelablePromise<ApiResultMapLongInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/counter/batch',
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
     * 获取UV统计
     * @param dto
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public getUniqueVisitCount(
        dto: UVOperationDTO,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/counter/uv/get',
            query: {
                'dto': dto,
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
     * 获取单个计数
     * @param dto
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getCounter(
        dto: CounterOperationDTO,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/counter/get',
            query: {
                'dto': dto,
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
     * 获取所有计数
     * @param dto
     * @returns ApiResultMapStringInteger OK
     * @throws ApiError
     */
    public getCounters(
        dto: CounterOperationDTO,
    ): CancelablePromise<ApiResultMapStringInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/counter/all',
            query: {
                'dto': dto,
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
