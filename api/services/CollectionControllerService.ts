/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCollection } from '../models/ApiResultCollection';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMapLongInteger } from '../models/ApiResultMapLongInteger';
import type { ApiResultPageBaseRespCollection } from '../models/ApiResultPageBaseRespCollection';
import type { Collection } from '../models/Collection';
import type { CollectionAddRequest } from '../models/CollectionAddRequest';
import type { CollectionCheckRequest } from '../models/CollectionCheckRequest';
import type { CollectionCountRequest } from '../models/CollectionCountRequest';
import type { CollectionPageRequest } from '../models/CollectionPageRequest';
import type { PageBaseRequest } from '../models/PageBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CollectionControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取收藏信息
     * @param id
     * @returns ApiResultCollection OK
     * @throws ApiError
     */
    public getCollection(
        id: number,
    ): CancelablePromise<ApiResultCollection> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection',
            query: {
                'id': id,
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
     * 更新收藏
     * @param requestBody
     * @returns ApiResultCollection OK
     * @throws ApiError
     */
    public updateCollection(
        requestBody: Collection,
    ): CancelablePromise<ApiResultCollection> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/collection',
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
     * 创建收藏
     * @param requestBody
     * @returns ApiResultCollection OK
     * @throws ApiError
     */
    public addCollection(
        requestBody: CollectionAddRequest,
    ): CancelablePromise<ApiResultCollection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection',
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
     * 删除收藏
     * @param id
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteCollection(
        id: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/collection',
            query: {
                'id': id,
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
     * 获取当前用户收藏
     * @param requestBody
     * @returns ApiResultPageBaseRespCollection OK
     * @throws ApiError
     */
    public getUserCollections(
        requestBody: CollectionPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/user',
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
     * 分页查询收藏
     * @param requestBody
     * @returns ApiResultPageBaseRespCollection OK
     * @throws ApiError
     */
    public getCollectionPage(
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/page',
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
     * 批量获取收藏数量
     * @param requestBody
     * @returns ApiResultMapLongInteger OK
     * @throws ApiError
     */
    public batchGetCollectionCount(
        requestBody: CollectionCountRequest,
    ): CancelablePromise<ApiResultMapLongInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/count/batch',
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
     * 检查用户是否已收藏资源
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public checkUserCollection(
        requestBody: CollectionCheckRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/check',
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
     * 获取收藏数量
     * @param resourceId
     * @param resourceType
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getCollectionCount(
        resourceId: number,
        resourceType: string,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection/count',
            query: {
                'resourceId': resourceId,
                'resourceType': resourceType,
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
