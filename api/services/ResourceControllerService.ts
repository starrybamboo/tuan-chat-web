/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCollectionList } from '../models/ApiResultCollectionList';
import type { ApiResultPageBaseRespCollectionList } from '../models/ApiResultPageBaseRespCollectionList';
import type { ApiResultPageBaseRespResourceResponse } from '../models/ApiResultPageBaseRespResourceResponse';
import type { ApiResultResourceResponse } from '../models/ApiResultResourceResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { CollectionResourcePageRequest } from '../models/CollectionResourcePageRequest';
import type { ResourceBatchAddToCollectionRequest } from '../models/ResourceBatchAddToCollectionRequest';
import type { ResourceCollectionCreateRequest } from '../models/ResourceCollectionCreateRequest';
import type { ResourcePageRequest } from '../models/ResourcePageRequest';
import type { ResourceUpdateRequest } from '../models/ResourceUpdateRequest';
import type { ResourceUploadRequest } from '../models/ResourceUploadRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ResourceControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 编辑资源
     * @param requestBody
     * @returns ApiResultResourceResponse OK
     * @throws ApiError
     */
    public updateResource(
        requestBody: ResourceUpdateRequest,
    ): CancelablePromise<ApiResultResourceResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/resource/update',
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
     * 按照资源类型获取当前用户所有资源
     * @param requestBody
     * @returns ApiResultPageBaseRespResourceResponse OK
     * @throws ApiError
     */
    public getUserResourcesByType(
        requestBody: ResourcePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespResourceResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/user/page',
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
     * 上传某一资源
     * @param requestBody
     * @returns ApiResultResourceResponse OK
     * @throws ApiError
     */
    public uploadResource(
        requestBody: ResourceUploadRequest,
    ): CancelablePromise<ApiResultResourceResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/upload',
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
     * 按照资源类型获取所有公开资源
     * @param requestBody
     * @returns ApiResultPageBaseRespResourceResponse OK
     * @throws ApiError
     */
    public getPublicResourcesByType(
        requestBody: ResourcePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespResourceResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/public/page',
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
     * 按照资源类型获取当前用户所有资源收藏集
     * @param requestBody
     * @returns ApiResultPageBaseRespCollectionList OK
     * @throws ApiError
     */
    public getUserResourceCollectionsByType(
        requestBody: ResourcePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/collections/user/page',
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
     * 获取某一资源收藏集中的所有资源
     * @param requestBody
     * @returns ApiResultPageBaseRespResourceResponse OK
     * @throws ApiError
     */
    public getResourcesInCollection(
        requestBody: CollectionResourcePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespResourceResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/collections/resources/page',
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
     * 根据资源类型获取所有公开资源收藏集
     * @param requestBody
     * @returns ApiResultPageBaseRespCollectionList OK
     * @throws ApiError
     */
    public getPublicResourceCollectionsByType(
        requestBody: ResourcePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/collections/public/page',
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
     * 创建资源收藏集
     * @param requestBody
     * @returns ApiResultCollectionList OK
     * @throws ApiError
     */
    public createResourceCollection(
        requestBody: ResourceCollectionCreateRequest,
    ): CancelablePromise<ApiResultCollectionList> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/collection',
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
     * 批量添加资源到资源收藏集
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public batchAddResourcesToCollection(
        requestBody: ResourceBatchAddToCollectionRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/resource/batch-add-to-collection',
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
     * 获取资源详情
     * @param resourceId 资源ID
     * @returns ApiResultResourceResponse OK
     * @throws ApiError
     */
    public getResourceDetail(
        resourceId: number,
    ): CancelablePromise<ApiResultResourceResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/resource/detail',
            query: {
                'resourceId': resourceId,
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
     * 删除资源
     * @param resourceId 资源ID
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteResource(
        resourceId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/resource/delete',
            query: {
                'resourceId': resourceId,
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
