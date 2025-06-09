/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCollectionListItem } from '../models/ApiResultCollectionListItem';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultPageBaseRespCollection } from '../models/ApiResultPageBaseRespCollection';
import type { CollectionListItemAddRequest } from '../models/CollectionListItemAddRequest';
import type { CollectionListItemBatchAddRequest } from '../models/CollectionListItemBatchAddRequest';
import type { CollectionListItemPageRequest } from '../models/CollectionListItemPageRequest';
import type { CollectionListItemRemoveRequest } from '../models/CollectionListItemRemoveRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CollectionListItemControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取列表中的收藏
     * @param requestBody
     * @returns ApiResultPageBaseRespCollection OK
     * @throws ApiError
     */
    public getListCollections(
        requestBody: CollectionListItemPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list/items',
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
     * 批量添加收藏到列表
     * @param requestBody
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public batchAddToList(
        requestBody: CollectionListItemBatchAddRequest,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list/items/batch',
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
     * 添加收藏到列表
     * @param requestBody
     * @returns ApiResultCollectionListItem OK
     * @throws ApiError
     */
    public addToList(
        requestBody: CollectionListItemAddRequest,
    ): CancelablePromise<ApiResultCollectionListItem> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/list/item',
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
     * 从列表中移除收藏
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public removeFromList(
        requestBody: CollectionListItemRemoveRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/collection/list/item',
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
