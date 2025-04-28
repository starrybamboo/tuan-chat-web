/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCollectionList } from '../models/ApiResultCollectionList';
import type { ApiResultPageBaseRespCollectionList } from '../models/ApiResultPageBaseRespCollectionList';
import type { CollectionList } from '../models/CollectionList';
import type { CollectionListAddRequest } from '../models/CollectionListAddRequest';
import type { PageBaseRequest } from '../models/PageBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CollectionListControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取收藏列表详情
     * @param collectionListId
     * @returns ApiResultCollectionList OK
     * @throws ApiError
     */
    public getCollectionList(
        collectionListId: number,
    ): CancelablePromise<ApiResultCollectionList> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection/list',
            query: {
                'collectionListId': collectionListId,
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
     * 更新收藏列表
     * @param requestBody
     * @returns ApiResultCollectionList OK
     * @throws ApiError
     */
    public updateCollectionList(
        requestBody: CollectionList,
    ): CancelablePromise<ApiResultCollectionList> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/collection/list',
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
     * 创建收藏列表
     * @param requestBody
     * @returns ApiResultCollectionList OK
     * @throws ApiError
     */
    public createCollectionList(
        requestBody: CollectionListAddRequest,
    ): CancelablePromise<ApiResultCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list',
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
     * 删除收藏列表
     * @param collectionListId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteCollectionList(
        collectionListId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/collection/list',
            query: {
                'collectionListId': collectionListId,
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
     * 获取用户的收藏列表
     * @param requestBody
     * @returns ApiResultPageBaseRespCollectionList OK
     * @throws ApiError
     */
    public getUserCollectionLists(
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list/user',
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
     * 获取热门公开收藏列表
     * @param requestBody
     * @returns ApiResultPageBaseRespCollectionList OK
     * @throws ApiError
     */
    public getPopularCollectionLists(
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list/popular',
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
}
