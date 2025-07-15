/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCollectionTag } from '../models/ApiResultCollectionTag';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultListCollectionTag } from '../models/ApiResultListCollectionTag';
import type { ApiResultListString } from '../models/ApiResultListString';
import type { CollectionTagAddRequest } from '../models/CollectionTagAddRequest';
import type { CollectionTagDeleteRequest } from '../models/CollectionTagDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CollectionTagControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取收藏的标签
     * @param collectionId
     * @returns ApiResultListCollectionTag OK
     * @throws ApiError
     */
    public getCollectionTags(
        collectionId: number,
    ): CancelablePromise<ApiResultListCollectionTag> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection/tag',
            query: {
                'collectionId': collectionId,
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
     * 为收藏添加标签
     * @param requestBody
     * @returns ApiResultCollectionTag OK
     * @throws ApiError
     */
    public addCollectionTag(
        requestBody: CollectionTagAddRequest,
    ): CancelablePromise<ApiResultCollectionTag> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/collection/tag',
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
     * 删除收藏标签
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteCollectionTag(
        requestBody: CollectionTagDeleteRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/collection/tag',
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
     * 获取用户所有标签
     * @returns ApiResultListString OK
     * @throws ApiError
     */
    public getUserTags(): CancelablePromise<ApiResultListString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection/tag/user',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取标签使用次数
     * @param tagName
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getTagUsageCount(
        tagName: string,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/collection/tag/usage',
            query: {
                'tagName': tagName,
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
