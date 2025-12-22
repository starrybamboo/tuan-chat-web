/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultListTag } from '../models/ApiResultListTag';
import type { ApiResultTag } from '../models/ApiResultTag';
import type { TagAddRequest } from '../models/TagAddRequest';
import type { TagDeleteRequest } from '../models/TagDeleteRequest';
import type { TagGetRequest } from '../models/TagGetRequest';
import type { TagUpdateRequest } from '../models/TagUpdateRequest';
import type { TagUsageRequest } from '../models/TagUsageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TagControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取标签信息
     * @param id
     * @returns ApiResultTag OK
     * @throws ApiError
     */
    public getTag(
        id: number,
    ): CancelablePromise<ApiResultTag> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/tag',
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
     * 更新标签
     * @param requestBody
     * @returns ApiResultTag OK
     * @throws ApiError
     */
    public updateTag(
        requestBody: TagUpdateRequest,
    ): CancelablePromise<ApiResultTag> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/tag',
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
     * 创建标签
     * @param requestBody
     * @returns ApiResultTag OK
     * @throws ApiError
     */
    public addTag(
        requestBody: TagAddRequest,
    ): CancelablePromise<ApiResultTag> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/tag',
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
     * 删除标签
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteTag(
        requestBody: TagDeleteRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/tag',
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
     * 获取标签使用次数
     * @param requestBody
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getTagUsageCount(
        requestBody: TagUsageRequest,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/tag/usage',
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
     * 根据类型和id获取标签
     * @param requestBody
     * @returns ApiResultListTag OK
     * @throws ApiError
     */
    public getTags(
        requestBody: TagGetRequest,
    ): CancelablePromise<ApiResultListTag> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/tag/get',
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
     * 获取对应类型的所有标签列表
     * @param tagType
     * @returns ApiResultListTag OK
     * @throws ApiError
     */
    public listTagsByType(
        tagType: number,
    ): CancelablePromise<ApiResultListTag> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/tag/list',
            query: {
                'tagType': tagType,
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
